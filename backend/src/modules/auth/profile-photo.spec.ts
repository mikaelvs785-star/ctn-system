import { describe, it, expect, vi } from 'vitest';
import { validate } from 'class-validator';
import { UpdatePhotoDto } from './auth.controller.js';
import { AuthService } from './auth.service.js';
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
 it('updates only the authenticated account and clears with NULL', async () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const service = new AuthService({ query } as unknown as DatabaseService);
  expect(await service.updatePhoto(17, '')).toEqual({ foto: null });
  expect(query.mock.calls[0][0]).toContain('WHERE id = $2');
  expect(query.mock.calls[0][1]).toEqual(['', 17, '']);
 });
});
