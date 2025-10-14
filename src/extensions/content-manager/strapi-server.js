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

module.exports = (plugin) => {
  if (!plugin?.services?.['content-types']) {
    return plugin;
  }

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

  const actionIds = [
    'plugin::content-manager.explorer.create',
    'plugin::content-manager.explorer.read',
    'plugin::content-manager.explorer.update',
    'plugin::content-manager.explorer.delete',
    'plugin::content-manager.explorer.publish',
    'plugin::content-manager.single-types.configure-view',
    'plugin::content-manager.collection-types.configure-view',
    'plugin::content-manager.components.configure-layout',
  ];

  const originalPermissionServiceFactory = plugin.services?.permission;

  if (typeof originalPermissionServiceFactory === 'function') {
    plugin.services.permission = (...args) => {
      const permissionService = originalPermissionServiceFactory(...args);
      const originalRegisterPermissions =
        permissionService?.registerPermissions?.bind(permissionService);

      if (originalRegisterPermissions) {
        permissionService.registerPermissions = async (...registerArgs) => {
          const actionProvider = globalThis.strapi?.admin?.services?.permission?.actionProvider;

          if (actionProvider) {
            for (const actionId of actionIds) {
              if (actionProvider.has?.(actionId) && typeof actionProvider.delete === 'function') {
                await actionProvider.delete(actionId);
              }
            }
          }

          return originalRegisterPermissions(...registerArgs);
        };
      }

      return permissionService;
    };
  }

  return plugin;
};
