module.exports = ({ env }) => {
  const connectionUrl = env('DATABASE_URL');
  console.log('CONFIG base connectionUrl:', connectionUrl);
  if (connectionUrl) {
    try {
      console.log('CONFIG parsed host:', new URL(connectionUrl).hostname);
    } catch (err) {
      console.log('CONFIG failed to parse URL', err);
    }
  }
  if (!connectionUrl) {
    return {
      connection: {
        client: 'sqlite',
        connection: {
          filename: env('DATABASE_FILENAME', 'data.db'),
        },
        useNullAsDefault: true,
      },
    };
  }

  return {
    connection: {
      client: 'postgres',
      connection: {
        connectionString: connectionUrl,
        ssl: env.bool('DATABASE_SSL', true) ? { rejectUnauthorized: false } : false,
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
    },
  };
};

