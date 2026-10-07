import { describe, it, expect, vi } from 'vitest';
import { validate } from 'class-validator';
import { CommunityPostDto } from './community.dto.js';
import { CommunitiesService } from './communities.service.js';
import type { DatabaseService } from '../../database/database.module.js';
import type { AuthUser } from '../auth/auth.metadata.js';

describe('Anexos nas publicações', () => {
  it('aceita texto, imagem ou link sem exigir texto adicional', async () => {
    for (const input of [{ conteudo: 'Olá' }, { imagem: 'data:image/jpeg;base64,YQ==' }, { link: 'https://example.com/a' }]) {
      expect(await validate(Object.assign(new CommunityPostDto(), input))).toHaveLength(0);
    }
  });
  it('rejeita vazio, SVG, protocolo executável e imagem excessiva', async () => {
    for (const input of [{}, { imagem: 'data:image/svg+xml;base64,YQ==' }, { link: 'javascript:alert(1)' }, { imagem: 'a'.repeat(1500001) }]) {
      expect((await validate(Object.assign(new CommunityPostDto(), input))).length).toBeGreaterThan(0);
    }
  });
  it('salva anexos somente depois de conferir acesso à comunidade', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ creatorId: 2 }] }).mockResolvedValueOnce({ rows: [{ id: 9 }] });
    const db = { transaction: async (work: (c: unknown) => unknown) => work({ query }) };
    const service = new CommunitiesService(db as unknown as DatabaseService);
    await service.createPost(1, '', { id: 2, role: 'PROFESSOR' } as AuthUser, { link: 'https://example.com' });
    expect(query.mock.calls[1][1]).toEqual(['', 1, 2, null, 'https://example.com']);
  });
});
