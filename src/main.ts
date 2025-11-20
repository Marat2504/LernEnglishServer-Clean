// src/main.ts (полный обновлённый — скопируй и замени)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // Для глобальной валидации DTO
import { Logger } from '@nestjs/common'; // Для логов
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // Для Swagger

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальный префикс: Все роуты будут /api/... (например, /api/auth/register)
  app.setGlobalPrefix('api');

  // Глобальная валидация для всех контроллеров (DTO: email, password)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Удаляет лишние поля из запроса
      transform: true, // Автоматически преобразует типы (string → number и т.д.)
      forbidNonWhitelisted: true, // 400 ошибка, если лишние поля
    })
  );

  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('English Box API')
    .setDescription('API для приложения изучения английского языка')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth' // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // Доступно по /api-docs

  // ИСПРАВЛЕНИЕ: CORS для Expo/React Native (добавлены origins для мобильного app)
  app.enableCors({
    origin: [
      'http://localhost:4200', // Твой Angular (оставляем)
      'http://localhost:19006', // Expo dev server (iOS симулятор, Chrome Debugger)
      'http://127.0.0.1:19006', // Альтернатива localhost для Expo
      'http://localhost:8081',
      'http://10.0.2.2:19006', // Android эмулятор (если dev server доступен)
      'exp://*',
      'https://unsuperseded-nonverbalized-deja.ngrok-free.dev',
      'https://*.ngrok-free.dev',
      '*', // Для dev: Разреши все origins (убери в production!)
    ],
    credentials: true, // Для cookies/JWT, если нужно (оставляем)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Добавлен OPTIONS для preflight
    allowedHeaders: 'Content-Type, Authorization', // Для JSON и Bearer токенов
    preflightContinue: false,
  });

  // Опционально: Логи для отладки (покажет все входящие запросы из app)
  app.use((req, res, next) => {
    Logger.log(
      `${req.method} ${req.originalUrl} from ${req.ip} (Origin: ${req.get('Origin')})`
    );
    next();
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Лог запуска
  Logger.log(`Application is running on: http://localhost:${port}`);
  Logger.log(
    'CORS enabled for Expo origins: localhost:19006, exp://*, * (dev mode)'
  );
}
bootstrap();
