module.exports = ({ env }) => ({
  url: env('RENDER_EXTERNAL_URL'),
  proxy: true,
  app: {
    keys: env.array('APP_KEYS'),
  },
});