import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PageDto } from '../../common/api.js';
import { RequireRoles } from '../auth/auth.metadata.js';
import type { AuthRequest } from '../auth/auth.metadata.js';
import { Role } from '../roles/role.enum.js';
import {
  ContentDto,
  CommunityPostDto,
  CreateCommunityDto,
  UpdateCommunityDto,
} from './community.dto.js';
import { CommunitiesService } from './communities.service.js';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly service: CommunitiesService) {}
  @Get() list(@Query() page: PageDto, @Req() req: AuthRequest) {
    return this.service.list(page, req.user);
  }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }
  @Post()
  @RequireRoles(Role.DIRECAO, Role.PROFESSOR)
  create(@Body() dto: CreateCommunityDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user);
  }
  @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommunityDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user);
  }
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.remove(id, req.user);
  }
  @Post(':id/members/me')
  @HttpCode(204)
  join(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.join(id, req.user);
  }
  @Delete(':id/members/me')
  @HttpCode(204)
  leave(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.leave(id, req.user);
  }
  @Delete(':id/members/:userId')
  @HttpCode(204)
  kick(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthRequest,
  ) {
    return this.service.leave(id, req.user, userId);
  }
  @Get(':id/members')
  members(
    @Param('id', ParseIntPipe) id: number,
    @Query() page: PageDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.members(id, page, req.user);
  }
  @Get(':id/posts')
  posts(
    @Param('id', ParseIntPipe) id: number,
    @Query() page: PageDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.posts(id, page, req.user);
  }
  @Post(':id/posts')
  createPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommunityPostDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.createPost(id, dto.conteudo, req.user, dto);
  }
  @Patch(':id/posts/:postId')
  editPost(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: ContentDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.updatePost(id, postId, dto.conteudo, req.user);
  }
  @Delete(':id/posts/:postId')
  @HttpCode(204)
  removePost(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Req() req: AuthRequest,
  ) {
    return this.service.removePost(id, postId, req.user);
  }
  @Get(':id/posts/:postId/comments')
  comments(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Query() page: PageDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.comments(id, postId, page, req.user);
  }
  @Post(':id/posts/:postId/comments')
  createComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: ContentDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.createComment(id, postId, dto.conteudo, req.user);
  }
  @Patch(':id/posts/:postId/comments/:commentId')
  editComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: ContentDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.editComment(
      id,
      postId,
      commentId,
      req.user,
      dto.conteudo,
    );
  }
  @Delete(':id/posts/:postId/comments/:commentId')
  @HttpCode(204)
  removeComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: AuthRequest,
  ) {
    return this.service.editComment(id, postId, commentId, req.user);
  }
}
