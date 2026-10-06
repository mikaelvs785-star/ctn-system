import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AuthService } from './auth.service.js';
import { Public } from './auth.metadata.js';
import type { AuthRequest } from './auth.metadata.js';
import { isValidCpf, normalizeCpf } from '../../common/cpf.js';

export class LoginDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeCpf(value) : value,
  )
  @ValidateIf((dto: LoginDto) => !dto.email)
  @Matches(/^\d{11}$/)
  cpf?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ValidateIf((dto: LoginDto) => !dto.cpf)
  email?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  senha: string;
}

export class RegisterStudentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nome: string;

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
}

export class ChangePasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) senhaAtual: string;
  @IsString() @MinLength(12) @MaxLength(128) novaSenha: string;
}
export class ResetPasswordDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token: string;
  @IsString() @MinLength(12) @MaxLength(128) novaSenha: string;
}

export class UpdatePhotoDto {
  @IsString()
  @MaxLength(400000)
  @Matches(/^(?:data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2})?$/, { message: 'Envie uma foto JPEG válida' })
  foto: string;

  @IsOptional()
  @IsString()
  @MaxLength(400000)
  @Matches(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
  original?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register/student')
  @HttpCode(201)
  registerStudent(@Body() dto: RegisterStudentDto, @Req() req: AuthRequest) {
    if (!isValidCpf(dto.cpf)) {
      throw new BadRequestException('CPF inválido');
    }
    return this.auth.registerStudent(dto, req.ip ?? 'unknown');
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() dto: LoginDto, @Req() req: AuthRequest) {
    return this.auth.login(dto.cpf ?? dto.email ?? '', dto.senha, req.ip ?? 'unknown');
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@Req() req: AuthRequest) {
    return req.user;
  }

  @Get('photo')
  @Header('Cache-Control', 'no-store')
  getPhoto(@Req() req: AuthRequest) {
    return this.auth.getPhoto(req.user!.id);
  }

  @Post('photo')
  @Header('Cache-Control', 'no-store')
  async updatePhoto(@Req() req: AuthRequest, @Body() dto: UpdatePhotoDto) {
    await this.auth.limit('photo:' + req.user.id);
    return this.auth.updatePhoto(req.user.id, dto.foto, dto.original);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Req() req: AuthRequest) {
    return this.auth.logout(req.token);
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.limit('change:' + req.user.id);
    await this.auth.changePassword(req.user.id, dto.senhaAtual, dto.novaSenha);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  resetPassword(@Req() req: AuthRequest, @Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(
      dto.token,
      dto.novaSenha,
      req.ip ?? 'unknown',
    );
  }
}
