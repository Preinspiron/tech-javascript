import * as process from 'process';

// Функция для парсинга DATABASE_URL
function parseDatabaseUrl(databaseUrl?: string) {
  if (!databaseUrl) return null;

  try {
    // Заменяем postgresql:// на postgres:// для совместимости с URL конструктором
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
      database: url.pathname.slice(1).split('?')[0], // Убираем первый символ '/' и query параметры
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
}

export default () => {
  // Парсим DATABASE_URL внутри функции, чтобы он был доступен после загрузки .env
  const dbUrl = process.env.DATABASE_URL;
  const parsedDb = parseDatabaseUrl(dbUrl);

  // Логирование для отладки
  if (parsedDb) {
    console.log('Parsed DB config:', {
      host: parsedDb.host,
      port: parsedDb.port,
      username: parsedDb.username,
      password: parsedDb.password ? '***' : 'EMPTY',
      database: parsedDb.database,
    });
  } else {
    console.warn('DATABASE_URL не найден или не может быть распарсен');
    console.warn('DATABASE_URL value:', dbUrl ? 'exists' : 'undefined');
  }

  return {
    port: process.env.PORT,
    node_env: process.env.NODE_ENV,
    client_url: process.env.CLIENT_URL,
    // Используем только DATABASE_URL
    db_port: parsedDb?.port || '5432',
    db_host: parsedDb?.host || '',
    db_user: parsedDb?.username || '',
    db_password: parsedDb?.password || '',
    db_database: parsedDb?.database || '',
    jwt_access_secret: process.env.JWT_ACCESS_SECRET,
    expire_access_jwt: process.env.EXPIRE_ACCESS_JWT,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    expire_refresh_jwt: process.env.EXPIRE_REFRESH_JWT,
    action_source: process.env.ACTION_SOURCE,
    signal_url: process.env.SIGNAL_URL,
    stape_api_key: process.env.STAPE_API_KEY, // API ключ для Stape (если требуется)
    tt_url: process.env.TIK_TOK_URL,
    tt_token: process.env.TIK_TOK_TOKEN,
    segment: process.env.SEGMENT,
  };
};
