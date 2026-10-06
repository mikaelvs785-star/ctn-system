import { describe, it, expect, vi } from 'vitest';
import { validate } from 'class-validator';
import { CommunitiesService } from './communities.service.js';
import { UpdateCommunityDto } from './community.dto.js';
import type { DatabaseService } from '../../database/database.module.js';
import type { AuthUser } from '../auth/auth.metadata.js';

describe('Capas de comunidades', () => {
  it('aceita remoção e raster, rejeita SVG e URL externa', async () => {
    for (const capa of ['', 'data:image/jpeg;base64,YQ==']) {
      expect(
        await validate(Object.assign(new UpdateCommunityDto(), { capa })),
      ).toHaveLength(0);
    }
    for (const capa of [
      'https://example.com/image.jpg',
      'data:image/svg+xml;base64,YQ==',
    ]) {
      expect(
        (await validate(Object.assign(new UpdateCommunityDto(), { capa })))
          .length,
      ).toBeGreaterThan(0);
    }
  });
  it('rejeita dados maiores que o limite', async () => {
    expect(
      (
        await validate(
          Object.assign(new UpdateCommunityDto(), {
            capa: 'a'.repeat(1_500_001),
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('impede aluno de alterar capa de outro responsável', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [{ id: 1, creatorId: 9 }] });
    const db = {
      transaction: async (work: (client: unknown) => unknown) =>
        work({ query }),
    };
    const service = new CommunitiesService(db as unknown as DatabaseService);
    await expect(
      service.update(1, { capa: '' }, { id: 2, role: 'ALUNO' } as AuthUser),
    ).rejects.toThrow('Apenas o criador ou a direção pode administrar');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('permite direção remover capa explicitamente', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 1, creatorId: 9 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, capa: null }] });
    const db = {
      transaction: async (work: (client: unknown) => unknown) =>
        work({ query }),
    };
    const service = new CommunitiesService(db as unknown as DatabaseService);
    expect(
      await service.update(1, { capa: '' }, {
        id: 2,
        role: 'DIRECAO',
      } as AuthUser),
    ).toEqual({ id: 1, capa: null });
    expect(query.mock.calls[1][1][3]).toBe('');
  });
});
