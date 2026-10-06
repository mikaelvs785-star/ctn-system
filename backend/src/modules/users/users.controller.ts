import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ParseIntPipe,
  Patch,
  Query,
  Header,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { RequireRoles } from '../auth/auth.metadata.js';
import { Role } from '../roles/role.enum.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { PageDto } from '../../common/api.js';
import { AuthService } from '../auth/auth.service.js';

@Controller('users')
@RequireRoles(Role.DIRECAO)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  findAll(@Query() page: PageDto) {
    return this.usersService.findAll(page);
  }

  @Get(':id/photo')
  @Header('Cache-Control', 'no-store')
  getPhoto(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getPhoto(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto.acao);
  }

  @Post(':id/password-reset')
  @Header('Cache-Control', 'no-store')
  issueReset(@Param('id', ParseIntPipe) id: number) {
    return this.auth.issueReset(id);
  }
}
