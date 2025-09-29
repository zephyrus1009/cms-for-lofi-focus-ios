module.exports = ({ env }) => ({\n  app: {\n    keys: env.array('APP_KEYS', ['devKeyA', 'devKeyB']),\n  },\n});\n
