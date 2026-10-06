import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { DatabaseService } from '../../database/database.module.js';
import { Role } from '../roles/role.enum.js';
describe('UsersService', () => {
  const query = vi.fn();
  const service = new UsersService({ query } as unknown as DatabaseService);
  beforeEach(() => vi.resetAllMocks());
  it('returns 404 for missing users', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('returns photos without exposing other user fields', async () => {
    query.mockResolvedValue({rows:[{foto:'crop',original:'full',cpf:'private'}]});
    expect(await service.getPhoto(7)).toEqual({foto:'crop',original:'full'});
    expect(query.mock.calls[0][1]).toEqual([7]);
  });
  it('returns 404 for a photo of a nonexistent user', async () => {
    query.mockResolvedValue({rows:[]});
    await expect(service.getPhoto(7)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('maps database uniqueness failures including concurrent registrations to 409', async () => {
    query.mockRejectedValue({ code: '23505' });
    await expect(
      service.create({
        nome: 'Ana',
        email: 'ana@example.com',
        senha: 'uma-senha-longa',
        cpf: '52998224725',
        role: Role.PROFESSOR,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
