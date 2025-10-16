const { createCoreService } = require('@strapi/strapi').factories;

const DEFAULT_POPULATE = {
  coverImage: true,
  tags: true,
  tracks: {
    populate: {
      song: {
        populate: {
          audioFile: true,
          tags: true,
        },
      },
    },
  },
};

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasKeys = (value) => Boolean(value && Object.keys(value).length > 0);

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

module.exports = createCoreService('api::playlist.playlist', ({ strapi }) => ({
  buildSearchFilters({ q, tag, song }) {
    const filters = {};
    const orFilters = [];

    if (q) {
      orFilters.push(
        { title: { $containsi: q } },
        { tags: { slug: { $containsi: q } } },
        { tracks: { song: { title: { $containsi: q } } } },
        { tracks: { song: { artist: { $containsi: q } } } },
        { tracks: { song: { slug: { $containsi: q } } } }
      );
    }

    if (tag) {
      filters.tags = { slug: { $eq: tag } };
    }

    if (song) {
      filters.tracks = {
        song: {
          slug: { $eq: song },
        },
      };
    }

    if (orFilters.length > 0) {
      filters.$or = orFilters;
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

  ensureTracksAreOrdered(response) {
    if (!response || !response.data) {
      return response;
    }

    const sortTracks = (tracks = []) =>
      [...tracks].sort((a, b) => {
        const first = a?.position ?? a?.attributes?.position ?? 0;
        const second = b?.position ?? b?.attributes?.position ?? 0;
        return first - second;
      });

    const applySort = (entity) => {
      if (!entity) {
        return;
      }

      if (isObject(entity) && isObject(entity.attributes)) {
        const tracks = entity.attributes.tracks;
        if (Array.isArray(tracks)) {
          entity.attributes.tracks = sortTracks(tracks);
        }
      } else if (isObject(entity)) {
        const tracks = entity.tracks;
        if (Array.isArray(tracks)) {
          entity.tracks = sortTracks(tracks);
        }
      }
    };

    if (Array.isArray(response.data)) {
      response.data.forEach(applySort);
    } else {
      applySort(response.data);
    }

    return response;
  },
}));
