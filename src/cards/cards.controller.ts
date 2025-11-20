// src/cards/cards.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  Put,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateLearnedDto } from './dto/update-learned.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('cards') // Группа в Swagger
@ApiBearerAuth() // JWT в Swagger
@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {} // Только CardsService

  // Добавить карточку
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать карточку' })
  @ApiResponse({ status: 201, description: 'Карточка создана.' })
  async create(@Request() req, @Body() createCardDto: CreateCardDto) {
    return this.cardsService.createCard(req.user.id, createCardDto);
  }

  // Получить все картчоки пользователя (глобальыне + пользовательские)
  @Get()
  @ApiOperation({
    summary: 'Получить все карточки (фильтр по тегам: ?tags=tag1,tag2)',
  })
  async findAll(@Request() req, @Query('tags') tagsQuery?: string) {
    const filterTags = tagsQuery ? tagsQuery.split(',') : [];
    return this.cardsService.findAllCards(req.user.id, filterTags);
  }

  // Получить удаленные карточки
  @Get('deleted')
  @ApiOperation({ summary: 'Получить удалённые карточки' })
  async findDeleted(@Request() req) {
    const userId = req.user.id;
    if (!userId) {
      throw new BadRequestException('User  ID не найден в JWT-токене');
    }
    return this.cardsService.findDeletedCards(userId);
  }

  // Привязать тег к карточке (tagId в URL, body пустой)
  @Post(':cardId/tags/:tagId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Привязать тег к карточке' })
  @ApiParam({ name: 'cardId', description: 'UUID карточки' })
  @ApiParam({ name: 'tagId', description: 'UUID тега' })
  @ApiResponse({ status: 201, description: 'Тег привязан.' })
  @ApiResponse({ status: 404, description: 'Карточка или тег не найден.' })
  @ApiResponse({ status: 409, description: 'Тег уже привязан.' })
  async addTag(
    @Request() req,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string
  ) {
    return this.cardsService.addTagToCard(req.user.id, cardId, tagId);
  }

  // Отвязать тег от карточки
  @Delete(':cardId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отвязать тег от карточки' })
  @ApiParam({ name: 'cardId', description: 'UUID карточки' })
  @ApiParam({ name: 'tagId', description: 'UUID тега' })
  @ApiResponse({ status: 204, description: 'Тег отвязан.' })
  @ApiResponse({ status: 404, description: 'Связь не найдена.' })
  async removeTag(
    @Request() req,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string
  ) {
    await this.cardsService.removeTagFromCard(req.user.id, cardId, tagId);
  }

  // Получить теги для карточки
  @Get(':cardId/tags')
  @ApiOperation({ summary: 'Получить теги для карточки' })
  @ApiParam({ name: 'cardId', description: 'UUID карточки' })
  @ApiResponse({ status: 200, description: 'Список тегов.' })
  async getTagsForCard(
    @Request() req,
    @Param('cardId', ParseUUIDPipe) cardId: string
  ) {
    return this.cardsService.findTagsForCard(req.user.id, cardId);
  }

  // Восстановить удаленную картчоку по id
  @Put(':id/restore')
  @ApiOperation({ summary: 'Восстановить удалённую карточку' })
  @ApiResponse({ status: 200, description: 'Карточка восстановлена.' })
  async restore(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.cardsService.restoreCard(req.user.id, id);
  }

  // Получить картчоку по id
  @Get(':id')
  @ApiOperation({ summary: 'Получить одну карточку' })
  async findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.cardsService.findCardById(req.user.id, id);
  }

  // Обновить картчоку по id
  @Patch(':id')
  @ApiOperation({ summary: 'Обновить карточку' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCardDto: Partial<CreateCardDto>
  ) {
    return this.cardsService.updateCard(req.user.id, id, updateCardDto);
  }

  // Удалить картчоку по id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить карточку (soft delete)' })
  async remove(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    await this.cardsService.deleteCard(req.user.id, id);
  }

  // Обновить статус выученности карточки
  @Patch(':id/learned')
  @ApiOperation({ summary: 'Обновить статус выученности карточки (ручное переключение)' })
  @ApiResponse({ status: 200, description: 'Статус обновлён.' })
  async updateLearned(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLearnedDto: UpdateLearnedDto
  ) {
    return this.cardsService.updateLearnedStatus(req.user.id, id, updateLearnedDto.isLearned);
  }
}
