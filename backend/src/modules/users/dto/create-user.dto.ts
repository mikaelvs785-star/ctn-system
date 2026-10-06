import {
  IsEmail,
  IsOptional,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Role } from '../../roles/role.enum.js';
import { Transform } from 'class-transformer';
import { normalizeCpf } from '../../../common/cpf.js';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nome: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeCpf(value) : value,
  )
  @Matches(/^\d{11}$/, { message: 'CPF inválido' })
  cpf: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  senha: string;

  @IsIn([Role.PROFESSOR, Role.DIRECAO])
  role: Role;
}
