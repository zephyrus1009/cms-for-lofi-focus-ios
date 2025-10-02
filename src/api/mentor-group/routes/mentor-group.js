const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::mentor-group.mentor-group', {
  config: {
    find: { auth: false },
    findOne: { auth: false },
  },
});

