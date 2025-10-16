const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::song.song', {
  config: {
    find: {
      auth: false,
    },
    findOne: {
      auth: false,
    },
  },
  routes: [
    {
      method: 'GET',
      path: '/songs/search',
      handler: 'song.search',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/songs',
      handler: 'song.find',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/songs/:id',
      handler: 'song.findOne',
      config: {
        auth: false,
      },
    },
  ],
});
