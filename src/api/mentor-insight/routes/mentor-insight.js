const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::mentor-insight.mentor-insight', {
  config: {
    find: { auth: false },
    findOne: { auth: false },
  },
});

