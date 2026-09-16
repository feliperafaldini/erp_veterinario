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

describe('MEDICATIONS', () => {
  let app: INestApplication;
  let medicationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedRolesAndPermissions(app);

    const prisma = getPrisma(app);

    const medication = await prisma.medication.upsert({
      where: { name: 'Amoxicilina' },
      update: {},
      create: {
        name: 'Amoxicilina',
        description: 'Antibiótico beta-lactâmico de amplo espectro',
      },
    });
    medicationId = medication.id;

    await prisma.medication.upsert({
      where: { name: 'Meloxicam' },
      update: {},
      create: {
        name: 'Meloxicam',
        description: 'Anti-inflamatório não esteroide (AINE) com ação analgésica',
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
  });

  describe('GET /api/medications', () => {
    it('should list all medications for authenticated user', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/medications')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const names = response.body.map((m: any) => m.name);
      expect(names).toContain('Amoxicilina');
      expect(names).toContain('Meloxicam');
    });

    it('should return medications ordered by name', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/medications')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const names = response.body.map((m: any) => m.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should return id, name, description, and createdAt', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/medications')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const medication = response.body.find((m: any) => m.name === 'Amoxicilina');
      expect(medication).toBeDefined();
      expect(medication).toHaveProperty('id');
      expect(medication).toHaveProperty('name');
      expect(medication).toHaveProperty('description');
      expect(medication).toHaveProperty('createdAt');
      expect(medication.description).toBe('Antibiótico beta-lactâmico de amplo espectro');
    });

    it('should not expose internal fields', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/medications')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      for (const item of response.body) {
        expect(item).not.toHaveProperty('animalMedications');
      }
    });
  });

  describe('GET /api/medications/:id', () => {
    it('should return medication by id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(medicationId);
      expect(response.body.name).toBe('Amoxicilina');
      expect(response.body.description).toBe('Antibiótico beta-lactâmico de amplo espectro');
    });

    it('should return 404 for nonexistent id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/medications/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid uuid format', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/medications/invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without access token', async () => {
      await request(app.getHttpServer()).get('/api/medications').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/medications')
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
        .get('/api/medications')
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
        .get('/api/medications')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Medications is global', () => {
    it('should return the same medications to different tenants', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const response1 = await request(app.getHttpServer())
        .get('/api/medications')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/medications')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      const ids1 = response1.body.map((m: any) => m.id).sort();
      const ids2 = response2.body.map((m: any) => m.id).sort();

      expect(ids1).toEqual(ids2);
      expect(ids1.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('No mutation endpoints', () => {
    it('should return 404 for POST /api/medications', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/medications')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 404 for PATCH /api/medications/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 404 for DELETE /api/medications/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('Seed idempotency', () => {
    it('should not create duplicate medications', async () => {
      const prisma = getPrisma(app);

      const countBefore = await prisma.medication.count();

      await prisma.medication.upsert({
        where: { name: 'Amoxicilina' },
        update: {},
        create: {
          name: 'Amoxicilina',
          description: 'Antibiótico beta-lactâmico de amplo espectro',
        },
      });

      const countAfter = await prisma.medication.count();
      expect(countAfter).toBe(countBefore);
    });
  });
});
