import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
  registerUser,
  parseJwtPayload,
} from './helpers';

describe('JWT', () => {
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

  describe('Token Validation', () => {
    it('should accept valid token', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted');
    });

    it('should reject expired token', async () => {
      const jwt = require('jsonwebtoken');
      const secret = 'dev-jwt-secret-change-in-production';

      const expiredToken = jwt.sign(
        {
          sub: 'test-user-id',
          tenantId: 'test-tenant-id',
          iat: Math.floor(Date.now() / 1000) - 3600,
          exp: Math.floor(Date.now() / 1000) - 3600,
        },
        secret,
      );

      await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject invalid signature', async () => {
      const jwt = require('jsonwebtoken');

      const invalidToken = jwt.sign(
        {
          sub: 'test-user-id',
          tenantId: 'test-tenant-id',
        },
        'wrong-secret',
      );

      await request(app.getHttpServer())
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject missing token', async () => {
      await request(app.getHttpServer())
        .get('/api/test/protected')
        .expect(401);
    });
  });

  describe('Token Claims', () => {
    it('should contain only expected fields', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const payload = parseJwtPayload(user.accessToken);

      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('tenantId');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
      expect(Object.keys(payload)).toHaveLength(4);
    });

    it('should not contain roles', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const payload = parseJwtPayload(user.accessToken);

      expect(payload).not.toHaveProperty('roles');
      expect(payload).not.toHaveProperty('permissions');
    });

    it('should have correct userId in sub claim', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const payload = parseJwtPayload(user.accessToken);

      expect(payload.sub).toBe(user.userId);
    });

    it('should have correct tenantId', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const payload = parseJwtPayload(user.accessToken);

      expect(payload.tenantId).toBe(user.tenantId);
    });
  });
});
