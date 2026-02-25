// Ensure Web Crypto (randomUUID) is available globally for @nestjs/schedule
import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    // Log required environment variables (masked for security)
    console.log('🔍 Checking required environment variables...');
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'DUFFEL_API_KEY'];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      console.error('❌ Application cannot start without these variables.');
      process.exit(1);
    }
    console.log('✅ All required environment variables are present');

    const app = await NestFactory.create(AppModule, {
      rawBody: true,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable CORS
    const configuredOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : [];

    app.enableCors({
      origin: function (origin, callback) {
        // Allow requests with no origin (e.g., mobile apps, Postman, curl)
        if (!origin) return callback(null, true);

        // Always allow Vercel domains (including previews) and localhost
        if (
          /^https:\/\/.*\.vercel\.app$/.test(origin) ||
          origin.startsWith('http://localhost:')
        ) {
          return callback(null, true);
        }

        // Allow wildcard or explicitly configured domains (e.g., custom domains)
        if (process.env.ALLOWED_ORIGINS === '*' || configuredOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Reject others
        callback(null, false);
      },
      credentials: true,
    });

    // Register health check endpoints FIRST (before prefix, guards, middleware)
    // This ensures Railway can check health even if app is still initializing
    // These routes bypass all NestJS guards, middleware, and validation
    const httpAdapter = app.getHttpAdapter();

    // Root health check endpoint for Railway/load balancers
    httpAdapter.get('/', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
    });

    // Health check at /health (Railway checks this)
    // This MUST respond quickly and not depend on any services
    httpAdapter.get('/health', (req, res) => {
      // Immediately respond - no async operations
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
      // Log health check requests in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`💚 Health check requested from: ${req.ip || 'unknown'}`);
      }
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

    // API prefix (health checks above are registered before this, so they're not affected)
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

    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0'; // Use 0.0.0.0 for Railway/external access

    // Start the server
    await app.listen(port, host);

    // Give the server a moment to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`🚀 Application is running on: http://${host}:${port}`);
    console.log(`📚 Swagger docs available at: http://${host}:${port}/api/docs`);
    console.log(`💚 Health check available at: http://${host}:${port}/health`);
    console.log(`✅ Server is ready and accepting connections`);
    console.log(
      `🔍 Railway health check should now be able to reach: http://${host}:${port}/health`,
    );
  } catch (error) {
    console.error('❌ Failed to start application');
    console.error('Error type:', error?.constructor?.name || 'Unknown');
    console.error('Error message:', error?.message || String(error));
    if (error?.stack) {
      console.error('Stack trace:', error.stack);
    }

    // Check if it's an environment validation error
    if (error?.message?.includes('Environment validation failed')) {
      console.error('');
      console.error('⚠️  ENVIRONMENT VALIDATION FAILED');
      console.error('Required environment variables:');
      console.error('  - DATABASE_URL (required)');
      console.error('  - JWT_SECRET (required)');
      console.error('  - DUFFEL_API_KEY (required)');
      console.error('');
      console.error('Please check your Railway environment variables.');
    }

    process.exit(1);
  }
}

bootstrap();
