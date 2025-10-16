const { createCoreService } = require('@strapi/strapi').factories;

const DEFAULT_POPULATE = {
  tags: true,
  audioFile: true,
};

const hasKeys = (value) => Boolean(value && Object.keys(value).length > 0);

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const mergePopulate = (base, extra) => {
  if (!isObject(extra)) {
    return base;
  }

  const merged = { ...base };

  for (const key of Object.keys(extra)) {
    if (merged[key]) {
      if (isObject(merged[key]) && isObject(extra[key])) {
        merged[key] = mergePopulate(merged[key], extra[key]);
      }
    } else {
      merged[key] = extra[key];
    }
  }

  return merged;
};

module.exports = createCoreService('api::song.song', ({ strapi }) => ({
  buildSearchFilters({ q, tag, artist, title }) {
    const filters = {};
    const andFilters = [];

    if (tag) {
      andFilters.push({ tags: { slug: { $eq: tag } } });
    }

    if (artist) {
      andFilters.push({ artist: { $containsi: artist } });
    }

    if (title) {
      andFilters.push({ title: { $containsi: title } });
    }

    if (andFilters.length === 1) {
      Object.assign(filters, andFilters[0]);
    } else if (andFilters.length > 1) {
      filters.$and = andFilters;
    }

    if (q) {
      filters.$or = [
        { title: { $containsi: q } },
        { artist: { $containsi: q } },
        { tags: { slug: { $containsi: q } } },
      ];
    }

    return filters;
  },

  mergeFilters(existingFilters, additionalFilters) {
    const existing = existingFilters ?? {};
    const additional = additionalFilters ?? {};

    if (!hasKeys(existing)) {
      return additional;
    }

    if (!hasKeys(additional)) {
      return existing;
    }

    return { $and: [existing, additional] };
  },

  getDefaultPopulate(additionalPopulate) {
    return mergePopulate(DEFAULT_POPULATE, additionalPopulate);
  },
}));
