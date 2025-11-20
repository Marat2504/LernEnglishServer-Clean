// src/tags/tags.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { RestoreTagDto } from './dto/restore-tag.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger'; // Для docs (опционально)

@ApiTags('tags') // Группа в Swagger
@ApiBearerAuth() // JWT в Swagger
@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Создать тег (пользовательский или предустановленный)',
  })
  @ApiResponse({ status: 201, description: 'Тег создан.' })
  @ApiResponse({ status: 409, description: 'Тег уже существует.' })
  async create(@Request() req, @Body() createTagDto: CreateTagDto) {
    // @Body() с DTO — валидация
    return this.tagsService.createTag(req.user.id, createTagDto);
  }

  @Get()
  async findAll(@Request() req) {
    return this.tagsService.findAllTags(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.tagsService.findOneTag(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить тег' })
  @ApiResponse({ status: 200, description: 'Тег обновлён.' })
  @ApiResponse({ status: 409, description: 'Имя уже существует.' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTagDto: UpdateTagDto
  ) {
    return this.tagsService.updateTag(req.user.id, id, updateTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    await this.tagsService.deleteTag(req.user.id, id);
  }

  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Восстановить удалённый тег (soft undelete)' })
  @ApiParam({ name: 'id', description: 'UUID тега' })
  @ApiResponse({
    status: 200,
    description: 'Тег восстановлен.',
  })
  @ApiResponse({ status: 404, description: 'Тег не найден или не удалён.' })
  @ApiResponse({ status: 400, description: 'Тег не требует восстановления.' })
  async restore(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() restoreTagDto?: RestoreTagDto
  ) {
    return this.tagsService.restoreTag(req.user.id, id, restoreTagDto);
  }
}
