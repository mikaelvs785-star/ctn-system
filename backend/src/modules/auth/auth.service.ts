import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../../database/database.module.js';
import { hashPassword, verifyPassword } from './password.js';
import { isValidCpf, normalizeCpf } from '../../common/cpf.js';

const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const identity = (u: {
  id: number;
  nome: string;
  email: string | null;
  cpf?: string | null;
  foto?: string | null;
  role: string;
}) => ({ id: u.id, nome: u.nome, email: u.email, role: u.role, foto: u.foto ?? null, cpfMascarado: u.cpf ? `***.***.***-${u.cpf.slice(-2)}` : undefined });

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async updatePhoto(userId: number, foto: string) {
    await this.db.query('UPDATE public."user" SET foto = NULLIF($1, $3), "updatedAt" = now() WHERE id = $2', [foto, userId, '']);
    return { foto: foto || null };
  }


  async limit(key: string, maximum = 10) {
    const { rows } = await this.db.query(
      `INSERT INTO public."loginAttempt" (key, count, "expiresAt") VALUES ($1, 1, now() + interval '1 minute')
       ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "loginAttempt"."expiresAt" <= now() THEN 1 ELSE "loginAttempt".count + 1 END,
       "expiresAt" = CASE WHEN "loginAttempt"."expiresAt" <= now() THEN now() + interval '1 minute' ELSE "loginAttempt"."expiresAt" END RETURNING count`,
      [digest(key)],
    );
    if (rows[0].count > maximum)
      throw new HttpException('Muitas tentativas. Aguarde um minuto', 429);
  }

  async registerStudent(
    dto: { nome: string; cpf: string; senha: string },
    ip: string,
  ) {
    await this.limit('register:' + ip, 5);
    const cpf = normalizeCpf(dto.cpf);
    if (!isValidCpf(cpf)) throw new BadRequestException('CPF inválido');

    const hash = await hashPassword(dto.senha);
    try {
      const {
        rows: [user],
      } = await this.db.query(
        `INSERT INTO public."user"
          (nome, email, cpf, "senhaHash", ativo, "statusCadastro", "roleId", "updatedAt")
         SELECT $1, NULL, $2, $3, false, 'PENDENTE', id, now()
         FROM public.role WHERE name = 'ALUNO'
         RETURNING id`,
        [dto.nome.trim(), cpf, hash],
      );
      if (!user) throw new BadRequestException('Perfil de aluno não encontrado');
      return {
        message:
          'Cadastro enviado para aprovação da Direção. Você poderá entrar após a liberação.',
      };
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Este CPF já possui cadastro');
      throw error;
    }
  }

  async login(identifier: string, senha: string, ip: string) {
    await this.limit('login:' + ip);
    const normalizedCpf = normalizeCpf(identifier);
    const normalizedEmail = identifier.trim().toLowerCase();
    const {
      rows: [user],
    } = await this.db.query(
      `SELECT u.*, r.name AS role FROM public."user" u
       JOIN public.role r ON r.id = u."roleId"
       WHERE (u.cpf IS NOT NULL AND u.cpf = $1)
          OR (u.email IS NOT NULL AND u.email = $2)
       LIMIT 1`,
      [normalizedCpf, normalizedEmail],
    );

    const valid = await verifyPassword(senha, user?.senhaHash ?? '');
    if (!valid) throw new UnauthorizedException('CPF ou senha inválidos');
    if (user.statusCadastro === 'PENDENTE')
      throw new ForbiddenException('Seu cadastro ainda está aguardando aprovação da Direção');
    if (user.statusCadastro === 'RECUSADO')
      throw new ForbiddenException('Seu cadastro não foi aprovado. Procure a Direção');
    if (!user.ativo || user.statusCadastro === 'DESATIVADO')
      throw new UnauthorizedException('CPF ou senha inválidos');

    const token = randomBytes(32).toString('base64url');
    await this.db.transaction(async (c) => {
      const {
        rows: [current],
      } = await c.query(
        'SELECT ativo, "statusCadastro", "senhaHash" FROM public."user" WHERE id = $1 FOR UPDATE',
        [user.id],
      );
      if (
        !current?.ativo ||
        current.statusCadastro !== 'ATIVO' ||
        current.senhaHash !== user.senhaHash
      )
        throw new UnauthorizedException('CPF ou senha inválidos');
      await c.query(
        'INSERT INTO public.session ("tokenHash", "userId", "expiresAt") VALUES ($1, $2, now() + interval \'1 hour\')',
        [digest(token), user.id],
      );
    });
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      user: identity(user),
    };
  }

  async authenticate(token: string) {
    const {
      rows: [user],
    } = await this.db.query(
      `SELECT u.id, u.nome, u.email, u.cpf, u.foto, r.name AS role FROM public.session s
       JOIN public."user" u ON u.id = s."userId" JOIN public.role r ON r.id = u."roleId"
       WHERE s."tokenHash" = $1 AND s."expiresAt" > now()
         AND u.ativo = true AND u."statusCadastro" = 'ATIVO'`,
      [digest(token)],
    );
    if (!user) throw new UnauthorizedException('Sessão inválida ou expirada');
    return identity(user);
  }

  async logout(token: string) {
    await this.db.query('DELETE FROM public.session WHERE "tokenHash" = $1', [
      digest(token),
    ]);
  }

  async changePassword(id: number, atual: string, nova: string) {
    const {
      rows: [user],
    } = await this.db.query(
      'SELECT "senhaHash" FROM public."user" WHERE id = $1',
      [id],
    );
    if (!(await verifyPassword(atual, user?.senhaHash ?? '')))
      throw new UnauthorizedException('Senha atual inválida');
    const hash = await hashPassword(nova);
    await this.db.transaction(async (c) => {
      const { rowCount } = await c.query(
        `UPDATE public."user" SET "senhaHash" = $1, "updatedAt" = now()
         WHERE id = $2 AND "senhaHash" = $3 AND ativo = true AND "statusCadastro" = 'ATIVO'`,
        [hash, id, user.senhaHash],
      );
      if (!rowCount)
        throw new UnauthorizedException(
          'Conta ou senha alterada. Faça login novamente',
        );
      await c.query('DELETE FROM public.session WHERE "userId" = $1', [id]);
      await c.query('DELETE FROM public."passwordReset" WHERE "userId" = $1', [id]);
    });
  }

  async issueReset(id: number) {
    const token = randomBytes(32).toString('base64url');
    await this.db.transaction(async (c) => {
      const {
        rows: [user],
      } = await c.query(
        'SELECT ativo, "statusCadastro" FROM public."user" WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!user) throw new NotFoundException('Usuário não encontrado');
      if (!user.ativo || user.statusCadastro !== 'ATIVO')
        throw new BadRequestException('A conta precisa estar ativa para recuperar a senha');
      await c.query('DELETE FROM public."passwordReset" WHERE "userId" = $1', [id]);
      await c.query(
        'INSERT INTO public."passwordReset" ("tokenHash", "userId", "expiresAt") VALUES ($1, $2, now() + interval \'15 minutes\')',
        [digest(token), id],
      );
    });
    return { token, expires_in: 900 };
  }

  async resetPassword(token: string, senha: string, ip: string) {
    await this.limit('reset:' + ip);
    const hash = await hashPassword(senha);
    await this.db.transaction(async (c) => {
      const {
        rows: [reset],
      } = await c.query(
        'SELECT "userId" FROM public."passwordReset" WHERE "tokenHash" = $1 AND "expiresAt" > now()',
        [digest(token)],
      );
      if (!reset) throw new BadRequestException('Código inválido ou expirado');
      const {
        rows: [user],
      } = await c.query(
        'SELECT ativo, "statusCadastro" FROM public."user" WHERE id = $1 FOR UPDATE',
        [reset.userId],
      );
      if (!user?.ativo || user.statusCadastro !== 'ATIVO')
        throw new BadRequestException('Código inválido ou expirado');
      const { rowCount } = await c.query(
        'DELETE FROM public."passwordReset" WHERE "tokenHash" = $1 AND "expiresAt" > now()',
        [digest(token)],
      );
      if (!rowCount) throw new BadRequestException('Código inválido ou expirado');
      await c.query(
        'UPDATE public."user" SET "senhaHash" = $1, "updatedAt" = now() WHERE id = $2',
        [hash, reset.userId],
      );
      await c.query('DELETE FROM public.session WHERE "userId" = $1', [reset.userId]);
      await c.query('DELETE FROM public."passwordReset" WHERE "userId" = $1', [reset.userId]);
    });
  }
}
