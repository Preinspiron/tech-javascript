import * as process from 'process';

export default () => ({
  port: process.env.PORT,
  node_env: process.env.NODE_ENV,
  client_url: process.env.CLIENT_URL,
  db_port: process.env.DB_PORT,
  db_host: process.env.DB_HOST,
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASSWORD,
  db_database: process.env.DB_DATABASE,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  expire_access_jwt: process.env.EXPIRE_ACCESS_JWT,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  expire_refresh_jwt: process.env.EXPIRE_REFRESH_JWT,
  action_source: process.env.ACTION_SOURCE,
  signal_url: process.env.SIGNAL_URL,
  tik_tok_url: process.env.TIK_TOK_URL,
  tik_tok_token: process.env.TIK_TOK_TOKEN,
});
