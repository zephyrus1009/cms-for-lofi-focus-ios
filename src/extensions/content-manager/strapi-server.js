'use strict';

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

const resolveActionId = (actionAttributes) => {
  if (!actionAttributes) {
    return undefined;
  }

  if (typeof actionAttributes === 'string') {
    return actionAttributes;
  }

  if (actionAttributes.actionId) {
    return actionAttributes.actionId;
  }

  const { uid, pluginName } = actionAttributes;

  if (typeof uid !== 'string') {
    return undefined;
  }

  if (!pluginName) {
    return `api::${uid}`;
  }

  if (pluginName === 'admin') {
    return `admin::${uid}`;
  }

  return `plugin::${pluginName}.${uid}`;
};

const patchActionProvider = () => {
  const actionProvider = globalThis.strapi?.admin?.services?.permission?.actionProvider;

  if (!actionProvider || actionProvider.__cmsLofiDuplicateGuardPatched) {
    return;
  }

  const originalRegister = actionProvider.register;

  if (typeof originalRegister !== 'function') {
    actionProvider.__cmsLofiDuplicateGuardPatched = true;
    return;
  }

  const deleteIfExists = async function deleteIfExists(actionId) {
    if (!actionId) {
      return;
    }

    if (typeof this.has === 'function' && typeof this.delete === 'function' && this.has(actionId)) {
      await this.delete(actionId);
    }
  };

  actionProvider.register = async function registerWithDuplicateGuard(...args) {
    const [actionAttributes] = args;
    const actionId = resolveActionId(actionAttributes);

    await deleteIfExists.call(this, actionId);

    return originalRegister.apply(this, args);
  };

  const originalRegisterMany = actionProvider.registerMany;

  if (typeof originalRegisterMany === 'function') {
    actionProvider.registerMany = async function registerManyWithDuplicateGuard(...args) {
      const [actionsAttributes] = args;

      if (Array.isArray(actionsAttributes)) {
        for (const attributes of actionsAttributes) {
          const actionId = resolveActionId(attributes);
          await deleteIfExists.call(this, actionId);
        }
      }

      return originalRegisterMany.apply(this, args);
    };
  }

  actionProvider.__cmsLofiDuplicateGuardPatched = true;
};

module.exports = (plugin) => {
  if (!plugin?.services?.['content-types']) {
    return plugin;
  }

  patchActionProvider();

  const wrapLifecycleHook = (hookName) => {
    const originalHook = plugin[hookName];

    plugin[hookName] = function contentManagerLifecycleHookWrapper(...args) {
      patchActionProvider();

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
