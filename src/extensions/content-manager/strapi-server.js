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

  return plugin;
};
