import { describe, it, expect, vi } from 'vitest';
import { validate } from 'class-validator';
import { AuthController, UpdatePhotoDto } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { UsersController } from '../users/users.controller.js';
import type { DatabaseService } from '../../database/database.module.js';

describe('profile photo', () => {
 it('accepts JPEG and removal while rejecting SVG, URLs and oversized data', async () => {
  for (const foto of ['', 'data:image/jpeg;base64,YQ==']) {
   expect(await validate(Object.assign(new UpdatePhotoDto(), { foto }))).toHaveLength(0);
  }
  for (const foto of ['https://example.com/photo.jpg', 'data:image/svg+xml;base64,YQ==', 'data:image/jpeg;base64,' + 'a'.repeat(400000)]) {
   expect((await validate(Object.assign(new UpdatePhotoDto(), { foto }))).length).toBeGreaterThan(0);
  }
 });
 it('validates the optional original independently', async () => {
  expect(await validate(Object.assign(new UpdatePhotoDto(), { foto: 'data:image/jpeg;base64,YQ==', original: 'data:image/jpeg;base64,Yg==' }))).toHaveLength(0);
  expect((await validate(Object.assign(new UpdatePhotoDto(), { foto: '', original: 'https://example.com' }))).length).toBeGreaterThan(0);
 });
 it('updates only the authenticated account and clears with NULL', async () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const service = new AuthService({ query } as unknown as DatabaseService);
  expect(await service.updatePhoto(17, '')).toEqual({ foto: null });
  expect(query.mock.calls[0][0]).toContain('WHERE id = $2');
  expect(query.mock.calls[0][1]).toEqual(['', 17, '', '']);
 });
 it('stores original and crop together and falls back for legacy photos', async () => {
  const query = vi.fn().mockResolvedValue({ rows: [{ original: 'original' }] });
  const service = new AuthService({ query } as unknown as DatabaseService);
  await service.updatePhoto(17, 'crop', 'original');
  expect(query.mock.calls[0][1]).toEqual(['crop',17,'','original']);
  expect(await service.getPhoto(17)).toEqual({ original: 'original' });
  expect(query.mock.calls[1][1]).toEqual([17]);
 });
 it('allows every profile to edit its own photo and only directors to read managed photos', async () => {
  for (const role of ['ALUNO','PROFESSOR','DIRECAO']) {
   const auth={authenticate:vi.fn().mockResolvedValue({id:17,role})};
   const guard=new AuthGuard(new Reflector(),auth as unknown as AuthService);
   const context=(controller:typeof AuthController | typeof UsersController)=>({
    getHandler:()=>controller.prototype.getPhoto,
    getClass:()=>controller,
    switchToHttp:()=>({getRequest:()=>({headers:{authorization:'Bearer '+ 'a'.repeat(43)}})}),
   }) as unknown as ExecutionContext;
   expect(await guard.canActivate(context(AuthController))).toBe(true);
   if(role==='DIRECAO')expect(await guard.canActivate(context(UsersController))).toBe(true);
   else await expect(guard.canActivate(context(UsersController))).rejects.toBeInstanceOf(ForbiddenException);
  }
 });

});
