require('dotenv').config();

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
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
}

const parsedDb = parseDatabaseUrl(process.env.DATABASE_URL);


const dbConfig = parsedDb
  ? {
      username: parsedDb.username,
      password: parsedDb.password,
      database: parsedDb.database,
      host: parsedDb.host,
      port: parsedDb.port,
      dialect: 'postgres',
    }
  : {
      username: '',
      password: '',
      database: '',
      host: '',
      dialect: 'postgres',
    };


module.exports = {
  development: dbConfig,
};
