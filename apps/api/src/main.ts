import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { AllExceptionsFilter } from './lib/http-exception.filter';
import { ResponseInterceptor } from './lib/response.interceptor';
import 'dotenv/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // app.enableCors({
  //   origin: [
  //     process.env.FRONTEND_URL,
  //     // process.env.LIVE_FRONTEND_URL,
  //     // process.env.WWW_LIVE_FRONTEND_URL,
  //   ],
  //   // origin: '*',
  //   credentials: true,
  // });
  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-side / curl / no-origin requests
      if (!origin) return callback(null, true);

      try {
        const { hostname } = new URL(origin);

        // Allow all your tenant subdomains
        if (hostname.endsWith('.xfinance.ng') || hostname === 'xfinance.ng' || hostname === 'localhost') {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      } catch {
        return callback(new Error('Invalid origin'));
      }
    },
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger setup (before global prefix to ensure /api/docs is accessible)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('X-Finance API')
    .setDescription('API documentation for X-Finance')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt',
    )
    .addCookieAuth('cookieAuth')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Set global prefix after Swagger setup
  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
