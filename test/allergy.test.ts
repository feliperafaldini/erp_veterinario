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

describe('ALLERGIES', () => {
  let app: INestApplication;
  let allergyId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedRolesAndPermissions(app);

    const prisma = getPrisma(app);

    const allergy = await prisma.allergy.upsert({
      where: { name: 'Pulgas' },
      update: {},
      create: {
        name: 'Pulgas',
        description: 'Dermatite alérgica causada por picadas de pulgas',
      },
    });
    allergyId = allergy.id;

    await prisma.allergy.upsert({
      where: { name: 'Pólen' },
      update: {},
      create: {
        name: 'Pólen',
        description: 'Alergia a grãos de pólen',
      },
    });
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(app);
    await seedRolesAndPermissions(app);

    const prisma = getPrisma(app);
    const allergy = await prisma.allergy.upsert({
      where: { name: 'Pulgas' },
      update: {},
      create: {
        name: 'Pulgas',
        description: 'Dermatite alérgica causada por picadas de pulgas',
      },
    });
    allergyId = allergy.id;

    await prisma.allergy.upsert({
      where: { name: 'Pólen' },
      update: {},
      create: {
        name: 'Pólen',
        description: 'Alergia a grãos de pólen',
      },
    });
  });

  describe('GET /api/allergies', () => {
    it('should list all allergies for authenticated user', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/allergies')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const names = response.body.map((a: any) => a.name);
      expect(names).toContain('Pulgas');
      expect(names).toContain('Pólen');
    });

    it('should return allergies ordered by name', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/allergies')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const names = response.body.map((a: any) => a.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should return id, name, description, and createdAt', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/allergies')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const allergy = response.body.find((a: any) => a.name === 'Pulgas');
      expect(allergy).toBeDefined();
      expect(allergy).toHaveProperty('id');
      expect(allergy).toHaveProperty('name');
      expect(allergy).toHaveProperty('description');
      expect(allergy).toHaveProperty('createdAt');
      expect(allergy.description).toBe(
        'Dermatite alérgica causada por picadas de pulgas',
      );
    });
  });

  describe('GET /api/allergies/:id', () => {
    it('should return allergy by id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/allergies/${allergyId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(allergyId);
      expect(response.body.name).toBe('Pulgas');
      expect(response.body.description).toBe(
        'Dermatite alérgica causada por picadas de pulgas',
      );
    });

    it('should return 404 for nonexistent id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/allergies/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid uuid format', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/allergies/invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without access token', async () => {
      await request(app.getHttpServer()).get('/api/allergies').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/allergies')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('Tenant guard', () => {
    it('should return 403 for suspended user', async () => {
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
        .get('/api/allergies')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it('should return 403 for revoked user', async () => {
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
        .get('/api/allergies')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Allergies is global', () => {
    it('should return the same allergies to different tenants', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const response1 = await request(app.getHttpServer())
        .get('/api/allergies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/allergies')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      const ids1 = response1.body.map((a: any) => a.id).sort();
      const ids2 = response2.body.map((a: any) => a.id).sort();

      expect(ids1).toEqual(ids2);
      expect(ids1.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('No mutation endpoints', () => {
    it('should return 404 for POST /api/allergies', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/allergies')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 404 for PATCH /api/allergies/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch(`/api/allergies/${allergyId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 404 for DELETE /api/allergies/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete(`/api/allergies/${allergyId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });
});
