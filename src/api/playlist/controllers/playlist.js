const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::playlist.playlist', ({ strapi }) => ({
  async find(ctx) {
    const playlistService = strapi.service('api::playlist.playlist');
    const { q, tag, song, ...query } = ctx.query;
    const { filters: existingFilters, populate: userPopulate, ...restQuery } = query;

    const filters = playlistService.mergeFilters(
      existingFilters,
      playlistService.buildSearchFilters({ q, tag, song })
    );

    ctx.query = {
      ...restQuery,
      filters,
      populate: playlistService.getDefaultPopulate(userPopulate),
      sort: restQuery.sort ?? ['title:asc'],
    };

    const response = await super.find(ctx);
    return playlistService.ensureTracksAreOrdered(response);
  },

  async findOne(ctx) {
    const playlistService = strapi.service('api::playlist.playlist');
    const { populate: userPopulate, ...restQuery } = ctx.query;

    ctx.query = {
      ...restQuery,
      populate: playlistService.getDefaultPopulate(userPopulate),
    };

    const response = await super.findOne(ctx);
    return playlistService.ensureTracksAreOrdered(response);
  },

  async search(ctx) {
    const playlistService = strapi.service('api::playlist.playlist');
    const { q, tag, song, ...query } = ctx.query;
    const { filters: existingFilters, populate: userPopulate, ...restQuery } = query;

    const filters = playlistService.mergeFilters(
      existingFilters,
      playlistService.buildSearchFilters({ q, tag, song })
    );

    ctx.query = {
      ...restQuery,
      filters,
      populate: playlistService.getDefaultPopulate(userPopulate),
      sort: restQuery.sort ?? ['title:asc'],
    };

    const response = await super.find(ctx);
    return playlistService.ensureTracksAreOrdered(response);
  },
}));
