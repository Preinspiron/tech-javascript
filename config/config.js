const path = require('path');
require('dotenv').config({
  path: process.env.NODE_ENV === 'development' ? '.local.env' : '.env',
});

// Функция для парсинга DATABASE_URL
function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;

  try {
    const normalizedUrl = databaseUrl.replace(
      /^postgresql:\/\//,
      'postgres://',
    );
    const url = new URL(normalizedUrl);

    return {
      host: url.hostname,
      port: url.port || '5432',
      username: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.slice(1).split('?')[0],
      ssl:
        url.searchParams.get('sslmode') === 'require' ||
        url.searchParams.get('ssl') === 'true',
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
}

// Получаем конфигурацию из DATABASE_URL или из отдельных переменных
function getDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    if (parsed) {
      return {
        username: parsed.username,
        password: parsed.password,
        database: parsed.database,
        host: parsed.host,
        port: parsed.port,
        dialect: 'postgres',
        dialectOptions: {
          ssl: parsed.ssl
            ? {
                require: true,
                rejectUnauthorized: false,
              }
            : false,
        },
      };
    }
  }

  // Fallback на отдельные переменные, если DATABASE_URL не задан
  return {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || '5432',
    dialect: 'postgres',
    dialectOptions: {
      ssl:
        process.env.DB_SSL === 'true'
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
  };
}

const baseConfig = getDbConfig();

module.exports = {
  development: {
    ...baseConfig,
    logging: console.log,
  },
  production: {
    ...baseConfig,
    logging: false,
  },
};
