import { PartialType } from '@nestjs/mapped-types';
import { CreateTagDto } from './create-tag.dto';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
export class UpdateTagDto extends PartialType(CreateTagDto) {
  // PartialType делает все поля optional (для PATCH)
  // Добавьте, если нужно: @IsOptional() для name/isPredefined
}
