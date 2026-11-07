import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  // Nechta ishonchli proxy (Render LB, Next.js rewrite) orqasida ekanimizni belgilaydi.
  // Noto‘g‘ri qiymat IP-ga asoslangan rate limit va audit IP'larini soxtalashtirishga yo‘l ochadi.
  const trustProxy = config.get<string>('TRUST_PROXY', '1');
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      /^\d+$/.test(trustProxy)
        ? Number(trustProxy)
        : trustProxy === 'true'
          ? true
          : trustProxy === 'false'
            ? false
            : trustProxy,
    );
  app.use(helmet());
  app.use(cookieParser());
  const allowedOrigins = config
    .get<string>('WEB_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const renderHostname = config.get<string>('RENDER_EXTERNAL_HOSTNAME');
  if (renderHostname) allowedOrigins.push(`https://${renderHostname}`);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const configuredApiPort = config.get<string>('API_PORT');
  const port = configuredApiPort ? Number(configuredApiPort) : config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`StartUp Club API http://localhost:${port}/api/v1`);
}

bootstrap();
