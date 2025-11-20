// src/cards/dto/create-card.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';

export class CreateCardDto {
  @IsString({ message: 'Английское слово/фраза должно быть строкой' })
  @IsNotEmpty({ message: 'Английское слово/фраза не может быть пустым' })
  @MinLength(1, {
    message: 'Английское слово/фраза должно содержать хотя бы 1 символ',
  })
  @MaxLength(255, {
    message: 'Английское слово/фраза не может быть длиннее 255 символов',
  })
  englishWord: string;

  @IsString({ message: 'Русский перевод должен быть строкой' })
  @IsNotEmpty({ message: 'Русский перевод не может быть пустым' })
  @MinLength(1, {
    message: 'Русский перевод должен содержать хотя бы 1 символ',
  })
  @MaxLength(255, {
    message: 'Русский перевод не может быть длиннее 255 символов',
  })
  russianTranslation: string;

  @IsOptional()
  @IsString({ message: 'Заметки должны быть строкой' })
  @MaxLength(1000, { message: 'Заметки не могут быть длиннее 1000 символов' }) // Используем 1000, так как @db.Text
  notes?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Некорректный URL аудио' })
  @MaxLength(500, { message: 'URL аудио не может быть длиннее 500 символов' })
  audioUrl?: string;

  @IsOptional()
  @IsString({ message: 'Уровень сложности должен быть строкой' })
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1'], {
    message: 'Некорректный уровень сложности (A1-C1)',
  })
  difficultyLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

  // Если вы хотите сразу привязывать теги при создании карточки,
  // можно добавить поле для массива tagIds.
  // @IsOptional()
  // @IsArray()
  // @IsString({ each: true })
  // tagIds?: string[];
}
