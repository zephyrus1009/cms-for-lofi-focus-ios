'use strict';

const ACTION_PROVIDER_PATCH_FLAG = '__cmsLofiDuplicateGuardPatched';
const CONDITION_PROVIDER_PATCH_FLAG = '__cmsLofiConditionDuplicateGuardPatched';

const resolveActionId = (actionAttributes) => {
  if (!actionAttributes) {
    return undefined;
  }

  if (typeof actionAttributes === 'string') {
    return actionAttributes;
  }

  if (typeof actionAttributes.actionId === 'string') {
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

const resolveConditionId = (conditionAttributes) => {
  if (!conditionAttributes) {
    return undefined;
  }

  if (typeof conditionAttributes === 'string') {
    return conditionAttributes;
  }

  if (typeof conditionAttributes.id === 'string') {
    return conditionAttributes.id;
  }

  const { name, plugin } = conditionAttributes;

  if (typeof name !== 'string') {
    return undefined;
  }

  if (!plugin) {
    return `api::${name}`;
  }

  if (plugin === 'admin') {
    return `admin::${name}`;
  }

  return `plugin::${plugin}.${name}`;
};

const createProviderGuard = (resolveId, patchFlag) => (provider) => {
  if (!provider || provider[patchFlag]) {
    return;
  }

  const originalRegister = provider.register;
  const originalRegisterMany = provider.registerMany;

  const deleteIfExists = async function deleteIfExists(id) {
    if (!id) {
      return;
    }

    if (typeof this.has === 'function' && typeof this.delete === 'function' && this.has(id)) {
      await this.delete(id);
    }
  };

  if (typeof originalRegister === 'function') {
    provider.register = async function registerWithDuplicateGuard(...args) {
      const [attributes] = args;
      const id = resolveId(attributes);

      await deleteIfExists.call(this, id);

      return originalRegister.apply(this, args);
    };
  }

  if (typeof originalRegisterMany === 'function') {
    provider.registerMany = async function registerManyWithDuplicateGuard(...args) {
      const [attributesArray] = args;

      if (Array.isArray(attributesArray)) {
        for (const attributes of attributesArray) {
          const id = resolveId(attributes);
          await deleteIfExists.call(this, id);
        }
      }

      return originalRegisterMany.apply(this, args);
    };
  }

  provider[patchFlag] = true;
};

const patchPermissionProviders = (strapiInstance = globalThis.strapi) => {
  const permissionService = strapiInstance?.admin?.services?.permission;

  if (!permissionService) {
    return;
  }

  createProviderGuard(resolveActionId, ACTION_PROVIDER_PATCH_FLAG)(permissionService.actionProvider);
  createProviderGuard(resolveConditionId, CONDITION_PROVIDER_PATCH_FLAG)(permissionService.conditionProvider);
};

module.exports = {
  patchPermissionProviders,
};
