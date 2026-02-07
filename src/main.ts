// Ensure crypto is available globally for @nestjs/schedule
import * as crypto from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto as any;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      rawBody: true,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable CORS
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : ['http://localhost:3000', 'https://ebonybrucetravel-a4uy.vercel.app'];

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // API prefix
    app.setGlobalPrefix('api/v1');

    // Swagger documentation (only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Ebony Bruce Travels API')
        .setDescription('Booking System API Documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
    }

    // Root health check endpoint for Railway/load balancers
    app.getHttpAdapter().get('/', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
    });

    // Alternative health check at /health (common for Railway)
    app.getHttpAdapter().get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
    });

    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0'; // Use 0.0.0.0 for Railway/external access

    await app.listen(port, host);
    console.log(`🚀 Application is running on: http://${host}:${port}`);
    console.log(`📚 Swagger docs available at: http://${host}:${port}/api/docs`);
    console.log(`💚 Health check available at: http://${host}:${port}/health`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
