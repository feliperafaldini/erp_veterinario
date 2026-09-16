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

describe('TENANT ISOLATION', () => {
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

  it('should prevent cross-tenant access', async () => {
    const user1 = await registerUser(app, {
      email: 'user1@test.com',
      password: 'password123',
    });

    const user2 = await registerUser(app, {
      email: 'user2@test.com',
      password: 'password123',
    });

    const response = await request(app.getHttpServer())
      .get('/api/test/protected')
      .set('Authorization', `Bearer ${user1.accessToken}`)
      .expect(200);

    expect(response.body.tenantId).toBe(user1.tenantId);
    expect(response.body.tenantId).not.toBe(user2.tenantId);
  });

  it('should prevent suspended user from accessing tenant', async () => {
    const prisma = getPrisma(app);

    const user = await registerUser(app, {
      email: 'test@test.com',
      password: 'password123',
    });

    await prisma.userTenant.updateMany({
      where: {
        userId: user.userId,
        tenantId: user.tenantId,
      },
      data: { status: 'SUSPENDED' },
    });

    await request(app.getHttpServer())
      .get('/api/test/protected')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);
  });

  it('should prevent revoked user from accessing tenant', async () => {
    const prisma = getPrisma(app);

    const user = await registerUser(app, {
      email: 'test@test.com',
      password: 'password123',
    });

    await prisma.userTenant.updateMany({
      where: {
        userId: user.userId,
        tenantId: user.tenantId,
      },
      data: { status: 'REVOKED' },
    });

    await request(app.getHttpServer())
      .get('/api/test/protected')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);
  });
});
