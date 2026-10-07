import { Body, Controller, Get, Header, Injectable, Module, Post, Req } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsString, Matches } from 'class-validator';
import { DatabaseService } from '../../database/database.module.js';
import type { AuthRequest, AuthUser } from '../auth/auth.metadata.js';

export class ReadNotificationsDto {
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true })
  @Matches(/^(comment|news|student)-[0-9]+$/, { each: true })
  ids: string[];
}
export const notificationQuery = `
WITH events AS (
 SELECT 'comment-' || cm.id AS id, 'Resposta na comunidade' AS title,
 u.nome || ' comentou em ' || c.nome AS message, cm."createdAt" AS "createdAt",
 'community' AS kind, c.id AS "targetId"
 FROM public.comment cm JOIN public."communityPost" p ON p.id=cm."postId"
 JOIN public.community c ON c.id=p."communityId" JOIN public."user" u ON u.id=cm."authorId"
 WHERE cm."authorId" <> $1 AND (p."authorId"=$1 OR c."creatorId"=$1)
 AND ($2='DIRECAO' OR c."creatorId"=$1 OR EXISTS (
 SELECT 1 FROM public.membership m WHERE m."communityId"=c.id AND m."userId"=$1))
 AND cm."createdAt" > now() - interval '30 days'
 UNION ALL
 SELECT 'news-' || n.id, 'Aviso da escola', n.titulo, n."createdAt", 'news', n.id
 FROM public.news n WHERE n.categoria IN ('AVISO','COMUNICADO') AND n."authorId" <> $1
 AND n."createdAt" > now() - interval '30 days'
 UNION ALL
 SELECT 'student-' || u.id, 'Aluno aguardando aprovação', u.nome || ' solicitou acesso ao CEMTN',
 u."createdAt", 'student', u.id FROM public."user" u JOIN public.role r ON r.id=u."roleId"
 WHERE $2='DIRECAO' AND r.name='ALUNO' AND u."statusCadastro"='PENDENTE'
)
SELECT e.*, (nr."readAt" IS NOT NULL) AS read FROM events e
LEFT JOIN public."notificationRead" nr ON nr."eventId"=e.id AND nr."userId"=$1
ORDER BY e."createdAt" DESC, e.id DESC LIMIT 50
`;
@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}
  async list(user: AuthUser) {
    return (await this.db.query(notificationQuery, [user.id, user.role])).rows;
  }
  async read(ids: string[], user: AuthUser) {
    const visible = new Set((await this.list(user)).map((item) => item.id as string));
    const allowed = [...new Set(ids)].filter((id) => visible.has(id));
    if (allowed.length) await this.db.query(
      'INSERT INTO public."notificationRead" ("userId","eventId") SELECT $1, unnest($2::text[]) ON CONFLICT ("userId","eventId") DO NOTHING',
      [user.id, allowed],
    );
    return { success: true };
  }
}
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() @Header('Cache-Control', 'no-store') list(@Req() req: AuthRequest) { return this.service.list(req.user); }
  @Post('read') read(@Body() dto: ReadNotificationsDto, @Req() req: AuthRequest) { return this.service.read(dto.ids, req.user); }
}
@Module({ controllers: [NotificationsController], providers: [NotificationsService] })
export class NotificationsModule {}
