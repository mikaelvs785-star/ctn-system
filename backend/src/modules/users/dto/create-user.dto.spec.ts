import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

describe('CreateUserDto', () => {
  const valid = {
    nome: 'Ana',
    email: 'ana@escola.test',
    senha: 'uma-senha-longa',
    cpf: '52998224725',
    role: 'PROFESSOR',
  };

  it('accepts a valid registration', async () => {
    expect(await validate(plainToInstance(CreateUserDto, valid))).toHaveLength(
      0,
    );
  });

  it.each([undefined, '', 'curta', 'a'.repeat(129)])(
    'rejects an invalid password',
    async (senha) => {
      const errors = await validate(
        plainToInstance(CreateUserDto, { ...valid, senha }),
      );
      expect(errors.some((error) => error.property === 'senha')).toBe(true);
    },
  );
});
