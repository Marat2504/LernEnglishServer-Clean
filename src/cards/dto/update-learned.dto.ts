import { IsBoolean } from 'class-validator';

export class UpdateLearnedDto {
  @IsBoolean({ message: 'isLearned должно быть boolean (true/false)' })
  isLearned: boolean;
}
