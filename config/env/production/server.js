module.exports = ({ env }) => ({\n  url: env('RENDER_EXTERNAL_URL'),\n  proxy: true,\n  app: {\n    keys: env.array('APP_KEYS'),\n  },\n});\n
