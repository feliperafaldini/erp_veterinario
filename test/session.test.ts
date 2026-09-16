import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
  registerUser,
  extractRefreshTokenFromResponse,
  getPrisma,
} from './helpers';

describe('SESSION', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await seedRolesAndPermissions(app);
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(app);
    await seedRolesAndPermissions(app);
  });

  describe('POST /auth/select-tenant', () => {
    it('should create session with valid tenant', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .send({
          userId: user.userId,
          tenantId: user.tenantId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject tenant user does not belong to', async () => {
      const user1 = await registerUser(app, {
        email: 'user1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'user2@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .send({
          userId: user1.userId,
          tenantId: user2.tenantId,
        })
        .expect(403);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh with valid token', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const selectResponse = await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .send({
          userId: user.userId,
          tenantId: user.tenantId,
        });

      const refreshToken = extractRefreshTokenFromResponse(selectResponse);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', ['refresh_token=invalidtoken123'])
        .expect(401);
    });

    it('should reject revoked session', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const selectResponse = await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .send({
          userId: user.userId,
          tenantId: user.tenantId,
        });

      const refreshToken = extractRefreshTokenFromResponse(selectResponse);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(401);
    });

    it('should reject expired session', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const selectResponse = await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .send({
          userId: user.userId,
          tenantId: user.tenantId,
        });

      const refreshToken = extractRefreshTokenFromResponse(selectResponse);

      const { createHash } = await import('crypto');
      const refreshTokenHash = createHash('sha256')
        .update(refreshToken!)
        .digest('hex');

      const session = await prisma.session.findFirst({
        where: { refreshTokenHash },
      });

      await prisma.session.update({
        where: { id: session!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke session on logout', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const selectResponse = await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .send({
          userId: user.userId,
          tenantId: user.tenantId,
        });

      const refreshToken = extractRefreshTokenFromResponse(selectResponse);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(401);
    });
  });
});
