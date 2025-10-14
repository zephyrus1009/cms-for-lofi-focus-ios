'use strict';

const { patchPermissionProviders } = require('../shared/permission-provider-guard');

const ensurePermissionProvidersPatched = () => {
  patchPermissionProviders();
};

module.exports = (plugin = {}) => {
  ensurePermissionProvidersPatched();

  const wrapLifecycleHook = (hookName) => {
    const originalHook = plugin[hookName];

    plugin[hookName] = async function adminLifecycleHookWrapper(...args) {
      ensurePermissionProvidersPatched();

      if (typeof originalHook === 'function') {
        return originalHook.apply(this, args);
      }

      return undefined;
    };
  };

  wrapLifecycleHook('register');
  wrapLifecycleHook('bootstrap');

  return plugin;
};
