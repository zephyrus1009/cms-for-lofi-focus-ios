module.exports = ({ env }) => ({\n  host: env('HOST', '0.0.0.0'),\n  port: env.int('PORT', 1337),\n  app: {\n    keys: env.array('APP_KEYS'),\n  },\n});\n
