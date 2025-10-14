'use strict';

const { patchPermissionProviders } = require('../shared/permission-provider-guard');

const cloneArray = (value) => (Array.isArray(value) ? [...value] : []);

const normaliseLayouts = (layouts = {}) => {
  const baseLayouts = {
    edit: cloneArray(layouts.edit),
    editRelations: cloneArray(layouts.editRelations),
    list: cloneArray(layouts.list),
    bulk: cloneArray(layouts.bulk),
  };

  return {
    ...layouts,
    ...baseLayouts,
  };
};

const ensurePermissionProvidersPatched = () => {
  patchPermissionProviders();
};

module.exports = (plugin) => {
  if (!plugin?.services?.['content-types']) {
    return plugin;
  }

  ensurePermissionProvidersPatched();

  const wrapLifecycleHook = (hookName) => {
    const originalHook = plugin[hookName];

    plugin[hookName] = function contentManagerLifecycleHookWrapper(...args) {
      ensurePermissionProvidersPatched();

      if (typeof originalHook === 'function') {
        return originalHook.apply(this, args);
      }

      return undefined;
    };
  };

  wrapLifecycleHook('register');
  wrapLifecycleHook('bootstrap');

  const contentTypesService = plugin.services['content-types'];
  const originalFindConfiguration = contentTypesService.findConfiguration?.bind(contentTypesService);

  if (originalFindConfiguration) {
    contentTypesService.findConfiguration = async (...args) => {
      const config = await originalFindConfiguration(...args);
      if (!config) {
        return {
          uid: args[0]?.uid,
          settings: {},
          metadatas: {},
          layouts: normaliseLayouts(),
        };
      }

      return {
        ...config,
        settings: config.settings ?? {},
        metadatas: config.metadatas ?? {},
        layouts: normaliseLayouts(config.layouts),
      };
    };
  }

  const attachGetFieldLayouts = (service) => {
    const ensureLayouts = async (uid) => {
      const contentType = service.findContentType?.(uid);
      if (!contentType) {
        return normaliseLayouts();
      }

      const configuration = await service.findConfiguration(contentType);
      return normaliseLayouts(configuration.layouts);
    };

    const existingGetFieldLayouts = service.getFieldLayouts?.bind(service);

    if (existingGetFieldLayouts) {
      service.getFieldLayouts = async (...args) => {
        const layouts = await existingGetFieldLayouts(...args);
        return normaliseLayouts(layouts);
      };
    } else {
      service.getFieldLayouts = ensureLayouts;
    }
  };

  attachGetFieldLayouts(contentTypesService);

  return plugin;
};
