const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::mentor-group.mentor-group', ({ strapi }) => ({
  async find(ctx) {
    const defaultPopulate = { insights: true };
    ctx.query = {
      ...ctx.query,
      populate: ctx.query.populate ?? defaultPopulate,
      sort: ctx.query.sort ?? ['order:asc'],
    };
    return await super.find(ctx);
  },

  async findOne(ctx) {
    const defaultPopulate = { insights: true };
    ctx.query = {
      ...ctx.query,
      populate: ctx.query.populate ?? defaultPopulate,
    };
    return await super.findOne(ctx);
  },
}));