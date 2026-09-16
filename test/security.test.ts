import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
  registerUser,
  getPrisma,
} from './helpers';

describe('SECURITY', () => {
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

  describe('Refresh Token Security', () => {
    it('should not expose refresh token in JSON response', async () => {
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

      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('refresh_token');
    });

    it('should store refresh token as hash', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .send({
          userId: user.userId,
          tenantId: user.tenantId,
        })
        .expect(201);

      const session = await prisma.session.findFirst({
        where: { userId: user.userId },
      });

      expect(session!.refreshTokenHash).toBeDefined();
      expect(session!.refreshTokenHash.length).toBe(64);
    });

    it('should set HttpOnly cookie', async () => {
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

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const refreshCookie = cookies.find((c: string) =>
        c.startsWith('refresh_token='),
      );

      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('should set Secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
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

        const cookies = response.headers['set-cookie'];
        const refreshCookie = cookies.find((c: string) =>
          c.startsWith('refresh_token='),
        );

        expect(refreshCookie).toContain('Secure');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should not set Secure cookie in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
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

        const cookies = response.headers['set-cookie'];
        const refreshCookie = cookies.find((c: string) =>
          c.startsWith('refresh_token='),
        );

        expect(refreshCookie).not.toContain('Secure');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
