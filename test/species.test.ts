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

describe('SPECIES', () => {
  let app: INestApplication;
  let speciesId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedRolesAndPermissions(app);

    const prisma = getPrisma(app);

    const species = await prisma.species.upsert({
      where: { name: 'Cão' },
      update: {},
      create: {
        name: 'Cão',
        scientificName: 'Canis lupus familiaris',
      },
    });
    speciesId = species.id;

    await prisma.species.upsert({
      where: { name: 'Gato' },
      update: {},
      create: {
        name: 'Gato',
        scientificName: 'Felis catus',
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

  describe('GET /api/species', () => {
    it('should list all species for authenticated user', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/species')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const names = response.body.map((s: any) => s.name);
      expect(names).toContain('Cão');
      expect(names).toContain('Gato');
    });

    it('should return species ordered by name', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/species')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const names = response.body.map((s: any) => s.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should return id, name, scientificName, and createdAt', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/species')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const species = response.body.find((s: any) => s.name === 'Cão');
      expect(species).toBeDefined();
      expect(species).toHaveProperty('id');
      expect(species).toHaveProperty('name');
      expect(species).toHaveProperty('scientificName');
      expect(species).toHaveProperty('createdAt');
      expect(species.scientificName).toBe('Canis lupus familiaris');
    });
  });

  describe('GET /api/species/:id', () => {
    it('should return species by id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/species/${speciesId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(speciesId);
      expect(response.body.name).toBe('Cão');
      expect(response.body.scientificName).toBe('Canis lupus familiaris');
    });

    it('should return 404 for nonexistent id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/species/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid uuid format', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/species/invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without access token', async () => {
      await request(app.getHttpServer()).get('/api/species').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/species')
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
        .get('/api/species')
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
        .get('/api/species')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Species is global', () => {
    it('should return the same species to different tenants', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const response1 = await request(app.getHttpServer())
        .get('/api/species')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/species')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      const ids1 = response1.body.map((s: any) => s.id).sort();
      const ids2 = response2.body.map((s: any) => s.id).sort();

      expect(ids1).toEqual(ids2);
      expect(ids1.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('No mutation endpoints', () => {
    it('should return 404 for POST /api/species', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/species')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 404 for PATCH /api/species/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch(`/api/species/${speciesId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 404 for DELETE /api/species/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete(`/api/species/${speciesId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });
});
