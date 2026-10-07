import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.module.js';
import { PageDto, offset } from '../../common/api.js';
import type { AuthUser } from '../auth/auth.metadata.js';
import { CreateCommunityDto, UpdateCommunityDto } from './community.dto.js';

@Injectable()
export class CommunitiesService {
  constructor(private readonly db: DatabaseService) {}
  private admin(user: AuthUser, community: { creatorId: number }) {
    return user.role === 'DIRECAO' || user.id === community.creatorId;
  }
  private async access(
    c: PoolClient,
    id: number,
    user: AuthUser,
    management = false,
  ) {
    const {
      rows: [community],
    } = await c.query('SELECT * FROM public.community WHERE id=$1 FOR UPDATE', [
      id,
    ]);
    if (!community) throw new NotFoundException('Comunidade não encontrada');
    const manager = this.admin(user, community);
    if (management && !manager)
      throw new ForbiddenException(
        'Apenas o criador ou a direção pode administrar',
      );
    if (!manager) {
      const member = await c.query(
        'SELECT 1 FROM public.membership WHERE "communityId"=$1 AND "userId"=$2',
        [id, user.id],
      );
      if (!member.rowCount)
        throw new ForbiddenException(
          'Entre na comunidade para acessar o conteúdo',
        );
    }
    return community;
  }
  async list(page: PageDto, user: AuthUser) {
    return (
      await this.db.query(
        `SELECT c.*, u.nome AS "creatorName",
      EXISTS(SELECT 1 FROM public.membership m WHERE m."communityId"=c.id AND m."userId"=$3) AS participating,
      (SELECT COUNT(*)::int FROM public.membership m WHERE m."communityId"=c.id) AS "memberCount",
      (SELECT COUNT(*)::int FROM public."communityPost" p WHERE p."communityId"=c.id) AS "postCount"
      FROM public.community c JOIN public."user" u ON u.id=c."creatorId"
      ORDER BY c.id DESC LIMIT $1 OFFSET $2`,
        [page.limit, offset(page), user.id],
      )
    ).rows;
  }
  async get(id: number) {
    const {
      rows: [community],
    } = await this.db.query(
      'SELECT c.*, u.nome AS "creatorName" FROM public.community c JOIN public."user" u ON u.id=c."creatorId" WHERE c.id=$1',
      [id],
    );
    if (!community) throw new NotFoundException('Comunidade não encontrada');
    return community;
  }
  async create(dto: CreateCommunityDto, user: AuthUser) {
    return this.db.transaction(async (c) => {
      const {
        rows: [community],
      } = await c.query(
        'INSERT INTO public.community (nome, descricao, regras, "creatorId", capa, "updatedAt") VALUES ($1,$2,$3,$4,$5,now()) RETURNING *',
        [dto.nome, dto.descricao, dto.regras, user.id, dto.capa || null],
      );
      await c.query(
        'INSERT INTO public.membership ("communityId","userId") VALUES ($1,$2)',
        [community.id, user.id],
      );
      return community;
    });
  }
  async update(id: number, dto: UpdateCommunityDto, user: AuthUser) {
    return this.db.transaction(async (c) => {
      await this.access(c, id, user, true);
      return (
        await c.query(
          `UPDATE public.community SET nome=COALESCE($1,nome), descricao=COALESCE($2,descricao), regras=COALESCE($3,regras), capa=CASE WHEN $4::text IS NULL THEN capa ELSE NULLIF($4,'') END, "updatedAt"=now() WHERE id=$5 RETURNING *`,
          [dto.nome, dto.descricao, dto.regras, dto.capa, id],
        )
      ).rows[0];
    });
  }
  async remove(id: number, user: AuthUser) {
    await this.db.transaction(async (c) => {
      await this.access(c, id, user, true);
      await c.query(
        'DELETE FROM public.comment WHERE "postId" IN (SELECT id FROM public."communityPost" WHERE "communityId"=$1)',
        [id],
      );
      await c.query(
        'DELETE FROM public."communityPost" WHERE "communityId"=$1',
        [id],
      );
      await c.query('DELETE FROM public.membership WHERE "communityId"=$1', [
        id,
      ]);
      await c.query('DELETE FROM public.community WHERE id=$1', [id]);
    });
  }
  async join(id: number, user: AuthUser) {
    await this.db.transaction(async (c) => {
      const { rowCount } = await c.query(
        'SELECT id FROM public.community WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!rowCount) throw new NotFoundException('Comunidade não encontrada');
      await c.query(
        'INSERT INTO public.membership ("communityId","userId") VALUES ($1,$2) ON CONFLICT ("communityId","userId") DO NOTHING',
        [id, user.id],
      );
    });
  }
  async leave(id: number, user: AuthUser, memberId = user.id) {
    await this.db.transaction(async (c) => {
      const community = await this.access(c, id, user, memberId !== user.id);
      if (memberId === community.creatorId)
        throw new ConflictException('O criador não pode sair nem ser removido');
      await c.query(
        'DELETE FROM public.membership WHERE "communityId"=$1 AND "userId"=$2',
        [id, memberId],
      );
    });
  }
  async members(id: number, page: PageDto, user: AuthUser) {
    return this.db.transaction(async (c) => {
      await this.access(c, id, user);
      return (
        await c.query(
          'SELECT u.id, u.nome, r.name AS role, m."createdAt" FROM public.membership m JOIN public."user" u ON u.id=m."userId" JOIN public.role r ON r.id=u."roleId" WHERE m."communityId"=$1 AND u.ativo ORDER BY u.id LIMIT $2 OFFSET $3',
          [id, page.limit, offset(page)],
        )
      ).rows;
    });
  }
  async posts(id: number, page: PageDto, user: AuthUser) {
    return this.db.transaction(async (c) => {
      await this.access(c, id, user);
      return (
        await c.query(
          'SELECT p.*, u.nome AS "authorName" FROM public."communityPost" p JOIN public."user" u ON u.id=p."authorId" WHERE p."communityId"=$1 ORDER BY p.id DESC LIMIT $2 OFFSET $3',
          [id, page.limit, offset(page)],
        )
      ).rows;
    });
  }
  async createPost(id: number, conteudo: string, user: AuthUser, attachments: { imagem?: string; link?: string } = {}) {
    return this.db.transaction(async (c) => {
      await this.access(c, id, user);
      return (
        await c.query(
          'INSERT INTO public."communityPost" (conteudo,"communityId","authorId",imagem,link,"updatedAt") VALUES ($1,$2,$3,$4,$5,now()) RETURNING *',
          [conteudo, id, user.id, attachments.imagem || null, attachments.link || null],
        )
      ).rows[0];
    });
  }
  private async post(c: PoolClient, communityId: number, postId: number) {
    const {
      rows: [post],
    } = await c.query(
      'SELECT * FROM public."communityPost" WHERE id=$1 AND "communityId"=$2',
      [postId, communityId],
    );
    if (!post)
      throw new NotFoundException('Publicação não encontrada nesta comunidade');
    return post;
  }
  async updatePost(
    id: number,
    postId: number,
    conteudo: string,
    user: AuthUser,
  ) {
    return this.db.transaction(async (c) => {
      const community = await this.access(c, id, user);
      const post = await this.post(c, id, postId);
      if (post.authorId !== user.id && !this.admin(user, community))
        throw new ForbiddenException('Sem permissão para editar');
      return (
        await c.query(
          'UPDATE public."communityPost" SET conteudo=$1,"updatedAt"=now() WHERE id=$2 RETURNING *',
          [conteudo, postId],
        )
      ).rows[0];
    });
  }
  async removePost(id: number, postId: number, user: AuthUser) {
    await this.db.transaction(async (c) => {
      const community = await this.access(c, id, user);
      const post = await this.post(c, id, postId);
      if (post.authorId !== user.id && !this.admin(user, community))
        throw new ForbiddenException('Sem permissão para excluir');
      await c.query('DELETE FROM public.comment WHERE "postId"=$1', [postId]);
      await c.query('DELETE FROM public."communityPost" WHERE id=$1', [postId]);
    });
  }
  async comments(id: number, postId: number, page: PageDto, user: AuthUser) {
    return this.db.transaction(async (c) => {
      await this.access(c, id, user);
      await this.post(c, id, postId);
      return (
        await c.query(
          'SELECT cm.*, u.nome AS "authorName" FROM public.comment cm JOIN public."user" u ON u.id=cm."authorId" WHERE cm."postId"=$1 ORDER BY cm.id LIMIT $2 OFFSET $3',
          [postId, page.limit, offset(page)],
        )
      ).rows;
    });
  }
  async createComment(
    id: number,
    postId: number,
    conteudo: string,
    user: AuthUser,
  ) {
    return this.db.transaction(async (c) => {
      await this.access(c, id, user);
      await this.post(c, id, postId);
      return (
        await c.query(
          'INSERT INTO public.comment (conteudo,"postId","authorId","updatedAt") VALUES ($1,$2,$3,now()) RETURNING *',
          [conteudo, postId, user.id],
        )
      ).rows[0];
    });
  }
  async editComment(
    id: number,
    postId: number,
    commentId: number,
    user: AuthUser,
    conteudo?: string,
  ) {
    return this.db.transaction(async (c) => {
      const community = await this.access(c, id, user);
      await this.post(c, id, postId);
      const {
        rows: [comment],
      } = await c.query(
        'SELECT * FROM public.comment WHERE id=$1 AND "postId"=$2',
        [commentId, postId],
      );
      if (!comment)
        throw new NotFoundException(
          'Comentário não encontrado nesta publicação',
        );
      if (comment.authorId !== user.id && !this.admin(user, community))
        throw new ForbiddenException('Sem permissão para alterar comentário');
      if (conteudo === undefined) {
        await c.query('DELETE FROM public.comment WHERE id=$1', [commentId]);
        return;
      }
      return (
        await c.query(
          'UPDATE public.comment SET conteudo=$1,"updatedAt"=now() WHERE id=$2 RETURNING *',
          [conteudo, commentId],
        )
      ).rows[0];
    });
  }
}
