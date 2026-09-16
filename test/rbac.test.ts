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

describe('RBAC', () => {
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

  describe('ADMIN', () => {
    it('should access endpoint with ANIMAL_READ permission', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/test/with-permission')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted with permission');
    });
  });

  describe('VETERINARIAN', () => {
    it('should access endpoint with ANIMAL_READ permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const vetRole = await prisma.role.findUnique({
        where: { name: 'VETERINARIAN' },
      });

      const userTenant = await prisma.userTenant.findFirst({
        where: {
          userId: user.userId,
          tenantId: user.tenantId,
        },
      });

      await prisma.userTenantRole.create({
        data: {
          userTenantId: userTenant!.id,
          roleId: vetRole!.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/test/with-permission')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted with permission');
    });
  });

  describe('RECEPTIONIST', () => {
    it('should access endpoint with ANIMAL_READ permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'receptionist@test.com',
        password: 'password123',
      });

      const receptionistRole = await prisma.role.findUnique({
        where: { name: 'RECEPTIONIST' },
      });

      const userTenant = await prisma.userTenant.findFirst({
        where: {
          userId: user.userId,
          tenantId: user.tenantId,
        },
      });

      await prisma.userTenantRole.create({
        data: {
          userTenantId: userTenant!.id,
          roleId: receptionistRole!.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/test/with-permission')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted with permission');
    });
  });

  describe('Permission denied', () => {
    it('should return 403 for missing permission', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/test/without-permission')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it('should not grant access with nonexistent permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const userTenant = await prisma.userTenant.findFirst({
        where: {
          userId: user.userId,
          tenantId: user.tenantId,
        },
      });

      await prisma.userTenantRole.deleteMany({
        where: { userTenantId: userTenant!.id },
      });

      await request(app.getHttpServer())
        .get('/api/test/with-permission')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });
});
