module.exports = ({ env }) => ({
  app: {
    keys: env.array('APP_KEYS', ['devKeyA', 'devKeyB']),
  },
});