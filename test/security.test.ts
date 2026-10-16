import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
  registerUser,
  getPrisma,
  parseJwtPayload,
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
        .set('Authorization', `Bearer ${user.selectionToken}`)
        .send({
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
        .set('Authorization', `Bearer ${user.selectionToken}`)
        .send({
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
        .set('Authorization', `Bearer ${user.selectionToken}`)
        .send({
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
          .set('Authorization', `Bearer ${user.selectionToken}`)
          .send({
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
          .set('Authorization', `Bearer ${user.selectionToken}`)
          .send({
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

  describe('Selection Token Security', () => {
    it('should reject select-tenant without a token', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .send({ tenantId: user.tenantId })
        .expect(401);
    });

    it('should reject an access token used as selection token', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      // O access token tem { sub, tenantId } e não tem `purpose`: não dá
      // direito a criar outra sessão.
      await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ tenantId: user.tenantId })
        .expect(401);
    });

    it('should reject a tampered selection token', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const [header, payload, signature] = user.selectionToken.split('.');
      const flipped = signature.endsWith('a') ? 'b' : 'a';
      const tampered = `${header}.${payload}.${signature.slice(0, -1)}${flipped}`;

      await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .set('Authorization', `Bearer ${tampered}`)
        .send({ tenantId: user.tenantId })
        .expect(401);
    });

    it('should not accept a selection token as an access token', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${user.selectionToken}`)
        .expect(401);
    });

    it('should bind the session to the subject of the selection token', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .set('Authorization', `Bearer ${user.selectionToken}`)
        .send({ tenantId: user.tenantId })
        .expect(201);

      expect(parseJwtPayload(response.body.accessToken).sub).toBe(user.userId);
    });

    it('should not create a session for a tenant the token subject cannot access', async () => {
      const user1 = await registerUser(app, {
        email: 'user1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'user2@test.com',
        password: 'password123',
      });

      // A identidade vem do token: user1 não pode virar user2 nem acessar o
      // tenant de user2.
      await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .set('Authorization', `Bearer ${user1.selectionToken}`)
        .send({ tenantId: user2.tenantId })
        .expect(403);
    });
  });
});
