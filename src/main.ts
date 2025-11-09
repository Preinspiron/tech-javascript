import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

async function bootstrap() {
  // Используем NODE_ENV напрямую из переменных окружения
  // Это стандартная переменная Node.js, которая устанавливается через:
  // - npm run start:dev -> NODE_ENV=development
  // - npm run start:prod -> NODE_ENV=production
  // - render.com автоматически устанавливает NODE_ENV=production
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Используем HTTPS только в development режиме
  // В production (например, на render.com) SSL обрабатывается на уровне платформы
  const httpsOptions: HttpsOptions | undefined =
    nodeEnv === 'development' ? await getHttpsOptions() : undefined;

  const app = httpsOptions
    ? await NestFactory.create(AppModule, { httpsOptions })
    : await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  console.warn('Custom->config2 -> port', configService.get('port'));

  const port = configService.get<number>('port', 4000);

  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`Running in ${nodeEnv} mode on ${protocol}://localhost:${port}`);

  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  app.enableCors({
    origin: '*',
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type',
  });
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  const config = new DocumentBuilder()
    .setTitle('Lesson api')
    .setDescription('This api for lesson')
    .setVersion('1.0')
    .addTag('API')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  console.log(`Server started successfully on ${protocol}://localhost:${port}`);
}

async function getHttpsOptions(): Promise<HttpsOptions | undefined> {
  // Используем HTTPS только в development режиме
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    console.log('Production mode: SSL handled by platform (e.g., render.com)');
    return undefined;
  }

  const certPath = path.join(process.cwd(), 'certs', 'localhost-cert.pem');
  const keyPath = path.join(process.cwd(), 'certs', 'localhost-key.pem');

  // Проверяем наличие сертификатов
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  // Если сертификатов нет, создаем их программно (только в development)
  console.warn('SSL сертификаты не найдены. Создаю временные сертификаты...');
  await generateCertificates();

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  console.warn('Не удалось создать SSL сертификаты. Запуск без HTTPS.');
  return undefined;
}

async function generateCertificates(): Promise<void> {
  const certsDir = path.join(process.cwd(), 'certs');

  // Создаем папку certs если её нет
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  try {
    // Генерируем самоподписанный сертификат
    execSync(
      `openssl req -x509 -newkey rsa:4096 -nodes -keyout ${path.join(
        certsDir,
        'localhost-key.pem',
      )} -out ${path.join(
        certsDir,
        'localhost-cert.pem',
      )} -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"`,
      { stdio: 'ignore' },
    );
    console.log('SSL сертификаты успешно созданы!');
  } catch (error) {
    console.error(
      'Ошибка при создании сертификатов. Убедитесь, что openssl установлен.',
    );
    console.error('Или запустите вручную: ./scripts/generate-cert.sh');
  }
}

bootstrap();
