import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect(); // Подключение к БД при старте приложения
  }

  async onModuleDestroy() {
    await this.$disconnect(); // Отключение при завершении
  }
}
