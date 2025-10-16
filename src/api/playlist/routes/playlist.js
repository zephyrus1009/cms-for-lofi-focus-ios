const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::playlist.playlist', {
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
      path: '/playlists/search',
      handler: 'playlist.search',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/playlists',
      handler: 'playlist.find',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/playlists/:id',
      handler: 'playlist.findOne',
      config: {
        auth: false,
      },
    },
  ],
});
