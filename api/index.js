/**
 * Vercel Serverless Entry Point for NestJS
 * This file is used when deploying to Vercel
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');

let app;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      logger: false,
    });

    // Enable CORS
    app.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    });

    // Global validation pipe
    const { ValidationPipe } = require('@nestjs/common');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // API prefix
    app.setGlobalPrefix('api/v1');

    await app.init();
  }
  return app;
}

module.exports = async (req, res) => {
  const app = await bootstrap();
  const handler = app.getHttpAdapter().getInstance();
  return handler(req, res);
};


