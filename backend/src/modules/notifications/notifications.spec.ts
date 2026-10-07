import { describe, it, expect, vi } from 'vitest';
import { validate } from 'class-validator';
import { NotificationsService, ReadNotificationsDto, notificationQuery } from './notifications.module.js';
import type { DatabaseService } from '../../database/database.module.js';
import type { AuthUser } from '../auth/auth.metadata.js';
describe('Notificações', () => {
 it('consulta eventos usando o usuário e perfil autenticados', async () => {
  const query=vi.fn().mockResolvedValue({rows:[]});
  await new NotificationsService({query} as unknown as DatabaseService).list({id:7,role:'ALUNO'} as AuthUser);
  expect(query).toHaveBeenCalledWith(notificationQuery,[7,'ALUNO']);
 });
 it('não permite marcar eventos alheios e grava leitura somente para o destinatário', async () => {
  const query=vi.fn().mockResolvedValueOnce({rows:[{id:'comment-1'}]}).mockResolvedValueOnce({rows:[]});
  const service=new NotificationsService({query} as unknown as DatabaseService);
  await service.read(['comment-1','student-4','comment-1'],{id:7,role:'ALUNO'} as AuthUser);
  expect(query.mock.calls[1][1]).toEqual([7,['comment-1']]);
 });
 it('não grava quando nenhum evento solicitado está acessível', async () => {
  const query=vi.fn().mockResolvedValue({rows:[]});
  await new NotificationsService({query} as unknown as DatabaseService).read(['student-1'],{id:7,role:'ALUNO'} as AuthUser);
  expect(query).toHaveBeenCalledTimes(1);
 });
 it('valida identificadores e limita quantidade', async () => {
  expect(await validate(Object.assign(new ReadNotificationsDto(),{ids:['news-1']}))).toHaveLength(0);
  for(const ids of [['bad'],Array(51).fill('news-1'),[1]])expect((await validate(Object.assign(new ReadNotificationsDto(),{ids}))).length).toBeGreaterThan(0);
 });
});
