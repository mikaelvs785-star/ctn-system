import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.module.js';
import { hashPassword } from '../auth/password.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PageDto, offset } from '../../common/api.js';
import { isValidCpf, maskCpf, normalizeCpf } from '../../common/cpf.js';

const fields =
  '(u.foto IS NOT NULL) AS "hasFoto", u.id, u.nome, u.email, u.ativo, u."statusCadastro", u."roleId", r.name AS role, u."createdAt", u."updatedAt"';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  private present<T extends { cpf?: string | null }>(user: T) {
    const { cpf, ...safe } = user;
    return { ...safe, cpfMascarado: maskCpf(cpf) };
  }

  async findAll(page: PageDto = new PageDto()) {
    const result = await this.db.query(
      'SELECT ' + fields + ', u.cpf FROM public."user" u JOIN public.role r ON r.id = u."roleId" ORDER BY CASE WHEN u."statusCadastro" = \'PENDENTE\' THEN 0 ELSE 1 END, u.id DESC LIMIT $1 OFFSET $2',
      [page.limit, offset(page)],
    );
    return result.rows.map((user) => this.present(user));
  }

  async getPhoto(id: number) {
    const { rows: [user] } = await this.db.query('SELECT foto, COALESCE("fotoOriginal", foto) AS original FROM public."user" WHERE id = $1', [id]);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return { foto: user.foto ?? null, original: user.original ?? null };
  }

  async findOne(id: number) {
    const {
      rows: [user],
    } = await this.db.query(
      'SELECT ' + fields + ', u.cpf FROM public."user" u JOIN public.role r ON r.id = u."roleId" WHERE u.id = $1',
      [id],
    );
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.present(user);
  }

  async create(dto: CreateUserDto) {
    if (!['PROFESSOR', 'DIRECAO'].includes(dto.role))
      throw new BadRequestException('A Direção só pode criar professores e diretores');
    const cpf = normalizeCpf(dto.cpf);
    if (!isValidCpf(cpf)) throw new BadRequestException('CPF inválido');
    const hash = await hashPassword(dto.senha);

    try {
      const {
        rows: [user],
      } = await this.db.query(
        `INSERT INTO public."user"
          (nome, email, cpf, "senhaHash", ativo, "statusCadastro", "roleId", "updatedAt")
         SELECT $1, $2, $3, $4, true, 'ATIVO', id, now()
         FROM public.role WHERE name = $5 RETURNING id`,
        [dto.nome.trim(), dto.email.trim().toLowerCase(), cpf, hash, dto.role],
      );
      if (!user) throw new BadRequestException('Perfil não encontrado');
      return this.findOne(user.id);
    } catch (error) {
      if ((error as { code?: string; constraint?: string }).code === '23505')
        throw new ConflictException('CPF ou e-mail já cadastrado');
      throw error;
    }
  }

  async updateStatus(
    id: number,
    acao: 'APROVAR' | 'RECUSAR' | 'DESATIVAR' | 'REATIVAR',
  ) {
    const map = {
      APROVAR: { status: 'ATIVO', ativo: true, required: 'PENDENTE' },
      RECUSAR: { status: 'RECUSADO', ativo: false, required: 'PENDENTE' },
      DESATIVAR: { status: 'DESATIVADO', ativo: false, required: 'ATIVO' },
      REATIVAR: { status: 'ATIVO', ativo: true, required: 'DESATIVADO' },
    } as const;
    const next = map[acao];

    await this.db.transaction(async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(71824001)');
      const {
        rows: [user],
      } = await c.query(
        `SELECT u.id, u.ativo, u."statusCadastro", r.name AS role
         FROM public."user" u JOIN public.role r ON r.id = u."roleId"
         WHERE u.id = $1 FOR UPDATE OF u`,
        [id],
      );
      if (!user) throw new NotFoundException('Usuário não encontrado');
      if (user.statusCadastro !== next.required)
        throw new ConflictException('Esta ação não é válida para o status atual do usuário');

      if (acao === 'DESATIVAR' && user.role === 'DIRECAO') {
        const {
          rows: [count],
        } = await c.query(
          `SELECT count(*)::int AS total FROM public."user" u
           JOIN public.role r ON r.id = u."roleId"
           WHERE u.ativo AND u."statusCadastro" = 'ATIVO' AND r.name = 'DIRECAO'`,
        );
        if (count.total <= 1)
          throw new ConflictException('Não é permitido desativar o último diretor ativo');
      }

      await c.query(
        'UPDATE public."user" SET ativo=$1, "statusCadastro"=$2, "updatedAt"=now() WHERE id=$3',
        [next.ativo, next.status, id],
      );
      if (!next.ativo) {
        await c.query('DELETE FROM public.session WHERE "userId"=$1', [id]);
        await c.query('DELETE FROM public."passwordReset" WHERE "userId"=$1', [id]);
      }
    });

    return this.findOne(id);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.db.transaction(async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(71824001)');
      const {
        rows: [user],
      } = await c.query(
        'SELECT u.*, r.name AS role FROM public."user" u JOIN public.role r ON r.id = u."roleId" WHERE u.id = $1 FOR UPDATE OF u',
        [id],
      );
      if (!user) throw new NotFoundException('Usuário não encontrado');

      if (
        user.ativo &&
        user.role === 'DIRECAO' &&
        (dto.role !== undefined && dto.role !== 'DIRECAO')
      ) {
        const {
          rows: [count],
        } = await c.query(
          `SELECT count(*)::int AS total FROM public."user" u
           JOIN public.role r ON r.id = u."roleId"
           WHERE u.ativo AND u."statusCadastro" = 'ATIVO' AND r.name = $1`,
          ['DIRECAO'],
        );
        if (count.total <= 1)
          throw new ConflictException('Não é permitido remover o último diretor ativo');
      }

      const {
        rows: [role],
      } = await c.query('SELECT id FROM public.role WHERE name = $1', [
        dto.role ?? user.role,
      ]);
      if (!role) throw new BadRequestException('Perfil não encontrado');

      const nextCpf = dto.cpf !== undefined ? normalizeCpf(dto.cpf) : user.cpf;
      if (dto.cpf !== undefined && !isValidCpf(nextCpf))
        throw new BadRequestException('CPF inválido');

      try {
        await c.query(
          'UPDATE public."user" SET nome=$1, email=$2, cpf=$3, ativo=$4, "roleId"=$5, "updatedAt"=now() WHERE id=$6',
          [
            dto.nome ?? user.nome,
            dto.email ?? user.email,
            nextCpf,
            user.ativo,
            role.id,
            id,
          ],
        );
      } catch (error) {
        if ((error as { code?: string }).code === '23505')
          throw new ConflictException('CPF ou e-mail já cadastrado');
        throw error;
      }
      if (
        (dto.role !== undefined && dto.role !== user.role) ||
        (dto.email !== undefined && dto.email !== user.email)
      ) {
        await c.query('DELETE FROM public.session WHERE "userId"=$1', [id]);
        await c.query('DELETE FROM public."passwordReset" WHERE "userId"=$1', [id]);
      }
    });
    return this.findOne(id);
  }
}
