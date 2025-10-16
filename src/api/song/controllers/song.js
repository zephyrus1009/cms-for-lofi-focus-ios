const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::song.song', ({ strapi }) => ({
  async find(ctx) {
    const songService = strapi.service('api::song.song');
    const { q, tag, artist, title, ...query } = ctx.query;
    const { filters: existingFilters, populate: userPopulate, ...restQuery } = query;

    const filters = songService.mergeFilters(
      existingFilters,
      songService.buildSearchFilters({ q, tag, artist, title })
    );

    ctx.query = {
      ...restQuery,
      filters,
      populate: songService.getDefaultPopulate(userPopulate),
      sort: restQuery.sort ?? ['title:asc'],
    };

    return await super.find(ctx);
  },

  async findOne(ctx) {
    const songService = strapi.service('api::song.song');
    const { populate: userPopulate, ...restQuery } = ctx.query;

    ctx.query = {
      ...restQuery,
      populate: songService.getDefaultPopulate(userPopulate),
    };

    return await super.findOne(ctx);
  },

  async search(ctx) {
    const songService = strapi.service('api::song.song');
    const { q, tag, artist, title, ...query } = ctx.query;
    const { filters: existingFilters, populate: userPopulate, ...restQuery } = query;

    const filters = songService.mergeFilters(
      existingFilters,
      songService.buildSearchFilters({ q, tag, artist, title })
    );

    ctx.query = {
      ...restQuery,
      filters,
      populate: songService.getDefaultPopulate(userPopulate),
      sort: restQuery.sort ?? ['title:asc'],
    };

    return await super.find(ctx);
  },
}));
