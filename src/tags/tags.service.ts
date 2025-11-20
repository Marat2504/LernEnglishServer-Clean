// src/tags/tags.service.ts (полный файл — фикс для TagCreateInput: используем relation 'user' вместо 'userId')
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { RestoreTagDto } from './dto/restore-tag.dto';
import { Prisma } from '@prisma/client'; // Импорт для типов (TagCreateInput и т.д.)

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  // src/tags/tags.service.ts — только метод createTag (замените существующий; добавьте logging для отладки)
  async createTag(userId: string, createTagDto: CreateTagDto) {
    const { name, isPredefined = false } = createTagDto;

    let existingTag;

    try {
      if (isPredefined) {
        existingTag = await this.prisma.tag.findFirst({
          where: {
            userId: null, // Null OK здесь (не unique constraint)
            name,
            deletedAt: null, // Только активные
          },
        });
      } else {
        existingTag = await this.prisma.tag.findUnique({
          where: {
            userId_name: {
              userId, // string из JWT
              name,
            },
          },
        });
      }

      if (existingTag) {
        throw new ConflictException(
          `Тег "${name}" уже существует (для предустановленных — глобально).`
        );
      }

      // Создание тега
      let tag;
      if (isPredefined) {
        // Создание: Опускаем 'user' — Prisma установит userId: null автоматически (optional relation)
        const createData: Prisma.TagCreateInput = {
          name,
          isPredefined: true,
          // Нет 'user: { connect }' — relation null по умолчанию
        };
        tag = await this.prisma.tag.create({
          data: createData,
        });
      } else {
        const createData: Prisma.TagCreateInput = {
          name,
          isPredefined: false,
          user: {
            connect: { id: userId }, // Устанавливает userId в БД
          },
        };
        tag = await this.prisma.tag.create({
          data: createData,
        });
      }
      return tag;
    } catch (error) {
      console.error(
        `[ERROR] Ошибка в createTag для "${name}" (isPredefined: ${isPredefined}):`,
        {
          message: error.message,
          code: error.code,
          stack: error.stack?.substring(0, 200), // Укороченный stack для логов
        }
      );
      // Обработка специфических ошибок Prisma
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new ConflictException(`Тег "${name}" уже существует.`);
      } else if (error instanceof Prisma.PrismaClientValidationError) {
        throw new InternalServerErrorException(
          `Ошибка валидации Prisma: ${error.message}`
        );
      }
      // Другие ошибки — re-throw (стандарт 500)
      throw error;
    }
  }

  // Получить все теги пользователя (включая предустановленные)
  async findAllTags(userId: string) {
    return this.prisma.tag.findMany({
      where: {
        OR: [
          { userId: userId }, // Пользовательские (userId как скаляр OK)
          { userId: null as any, isPredefined: true }, // Предустановленные (assertion для OR)
        ],
        deletedAt: null, // Только активные
      },
      orderBy: { name: 'asc' }, // Алфавитный порядок
      select: {
        id: true,
        name: true,
        userId: true,
        isPredefined: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true, // Включаем для полноты (null для активных)
      },
    });
  }

  // Получить один тег по ID
  async findOneTag(userId: string, id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: {
        id,
        AND: [
          // Используем AND вместо OR для лучшей типизации
          {
            OR: [
              { userId: userId },
              { userId: null as any, isPredefined: true }, // Assertion
            ],
          },
          { deletedAt: null },
        ],
      },
      include: { user: true },
    });

    if (!tag) {
      throw new NotFoundException(`Тег с ID "${id}" не найден или недоступен.`);
    }

    if (tag.deletedAt) {
      throw new NotFoundException(`Тег с ID "${id}" удалён и недоступен.`); // 404 для deleted (не показываем)
    }

    // Проверка доступа: свой или глобальный
    if (tag.userId && tag.userId !== userId) {
      throw new NotFoundException(`Тег с ID "${id}" не принадлежит вам.`); // 404 вместо 403 (стандарт REST)
    }
    return tag;
  }

  // Восстановить тег (soft undelete)
  async restoreTag(userId: string, id: string, restoreTagDto?: RestoreTagDto) {
    console.log(`[DEBUG] Восстановление тега: ID="${id}", userId="${userId}"`); // Logging для отладки

    try {
      // Шаг 1: Найти тег (включая deleted)
      const deletedTag = await this.prisma.tag.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!deletedTag) {
        console.log(`[DEBUG] Тег ${id} не найден`);
        throw new NotFoundException(`Тег с ID "${id}" не найден.`);
      }

      if (!deletedTag.deletedAt) {
        console.log(`[DEBUG] Тег ${id} не удалён (deletedAt: null)`);
        throw new BadRequestException(
          `Тег с ID "${id}" не удалён и не требует восстановления.`
        );
      }

      // Шаг 2: Проверка доступа (свой или глобальный)
      if (deletedTag.userId && deletedTag.userId !== userId) {
        console.log(
          `[DEBUG] Доступ запрещён: userId ${deletedTag.userId} !== ${userId}`
        );
        throw new NotFoundException(
          `Тег с ID "${id}" не принадлежит вам и не может быть восстановлен.`
        );
      }

      // Шаг 3: Восстановление (update deletedAt: null + updatedAt)
      const restoredTag = await this.prisma.tag.update({
        where: { id },
        data: {
          deletedAt: null, // Undelete
          updatedAt: new Date(), // Обновляем timestamp
        },
      });

      console.log(`[DEBUG] Тег ${id} восстановлен успешно`);
      return restoredTag;
    } catch (error) {
      console.error(`[ERROR] Ошибка в restoreTag для ID "${id}":`, {
        message: error.message,
        code: error.code,
      });
      throw error; // Re-throw (NotFound, BadRequest и т.д.)
    }
  }

  // Обновить тег
  async updateTag(userId: string, id: string, updateTagDto: UpdateTagDto) {
    // Проверяем существование
    const existingTag = await this.findOneTag(userId, id); // Используем метод выше

    // Проверка уникальности имени (если меняем name)
    if (updateTagDto.name && updateTagDto.name !== existingTag.name) {
      // Фикс: Assertion для where (userId может быть null)
      const whereData = {
        userId_name: {
          userId: existingTag.userId as any, // null OK
          name: updateTagDto.name,
        },
      } as any;

      const nameConflict = await this.prisma.tag.findUnique({
        where: whereData,
      });

      if (nameConflict && nameConflict.id !== id) {
        throw new ConflictException(
          `Тег с именем "${updateTagDto.name}" уже существует.`
        );
      }
    }

    // Обновление: Не меняем userId/user (только переданные поля; immutable)
    const updateData: Prisma.TagUpdateInput = {
      ...(updateTagDto.name && { name: updateTagDto.name }),
      ...(updateTagDto.isPredefined !== undefined && {
        isPredefined: updateTagDto.isPredefined,
      }),
      updatedAt: new Date(),
    };

    return this.prisma.tag.update({
      where: { id },
      data: updateData,
    });
  }

  // Удалить тег (soft delete)
  async deleteTag(userId: string, id: string) {
    // Проверяем существование
    const existingTag = await this.findOneTag(userId, id);

    // Проверяем, используется ли тег в карточках
    const usedInCards = await this.prisma.cardTag.count({
      where: { tagId: id },
    });

    if (usedInCards > 0) {
      throw new BadRequestException(
        `Нельзя удалить тег "${existingTag.name}", так как он используется в ${usedInCards} карточках. Сначала отвяжите его.`
      );
    }

    // Soft delete
    return this.prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
