import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as compression from 'compression';
import helmet from 'helmet';
import * as morgan from 'morgan';
/*
**Entry point of the application
** Starts the NestJS application by creating an instance of the AppModule
** and listening on a specified port (default is 3000).

*/
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security middleware
  app.use(helmet());

  // Compression middleware
  app.use(compression());

  // Logging middleware
  app.use(morgan('combined'));

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Crafts API')
    .setDescription('API for Professional Crafts Website')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('crafts', 'Craft products endpoints')
    .addTag('categories', 'Product categories endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('reviews', 'Product reviews endpoints')
    .addTag('uploads', 'File upload endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();