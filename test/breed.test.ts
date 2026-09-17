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

describe('BREEDS', () => {
  let app: INestApplication;
  let breedId: string;
  let caoSpeciesId: string;
  let gatoSpeciesId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedRolesAndPermissions(app);

    const prisma = getPrisma(app);

    const cao = await prisma.species.upsert({
      where: { name: 'Cão' },
      update: {},
      create: { name: 'Cão', scientificName: 'Canis lupus familiaris' },
    });
    caoSpeciesId = cao.id;

    const gato = await prisma.species.upsert({
      where: { name: 'Gato' },
      update: {},
      create: { name: 'Gato', scientificName: 'Felis catus' },
    });
    gatoSpeciesId = gato.id;

    const breed = await prisma.breed.upsert({
      where: { speciesId_name: { speciesId: caoSpeciesId, name: 'Labrador Retriever' } },
      update: {},
      create: { speciesId: caoSpeciesId, name: 'Labrador Retriever' },
    });
    breedId = breed.id;

    await prisma.breed.upsert({
      where: { speciesId_name: { speciesId: caoSpeciesId, name: 'Poodle' } },
      update: {},
      create: { speciesId: caoSpeciesId, name: 'Poodle' },
    });

    await prisma.breed.upsert({
      where: { speciesId_name: { speciesId: gatoSpeciesId, name: 'Siamês' } },
      update: {},
      create: { speciesId: gatoSpeciesId, name: 'Siamês' },
    });

    await prisma.breed.upsert({
      where: { speciesId_name: { speciesId: gatoSpeciesId, name: 'Persa' } },
      update: {},
      create: { speciesId: gatoSpeciesId, name: 'Persa' },
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

  describe('GET /api/breeds', () => {
    it('should list all breeds for authenticated user', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/breeds')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(4);

      const names = response.body.map((b: any) => b.name);
      expect(names).toContain('Labrador Retriever');
      expect(names).toContain('Poodle');
      expect(names).toContain('Siamês');
      expect(names).toContain('Persa');
    });

    it('should return breeds ordered by name', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/breeds')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const names = response.body.map((b: any) => b.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should return id, name, speciesId, createdAt, and species', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/breeds')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const breed = response.body.find((b: any) => b.name === 'Labrador Retriever');
      expect(breed).toBeDefined();
      expect(breed).toHaveProperty('id');
      expect(breed).toHaveProperty('name');
      expect(breed).toHaveProperty('speciesId');
      expect(breed).toHaveProperty('createdAt');
      expect(breed).toHaveProperty('species');
      expect(breed.speciesId).toBe(caoSpeciesId);
      expect(breed.species.id).toBe(caoSpeciesId);
      expect(breed.species.name).toBe('Cão');
    });
  });

  describe('GET /api/breeds?speciesId=<uuid>', () => {
    it('should return only breeds of the given species', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/breeds?speciesId=${caoSpeciesId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(6);

      const names = response.body.map((b: any) => b.name);
      expect(names).toContain('Labrador Retriever');
      expect(names).toContain('Poodle');
      expect(names).toContain('Sem raça definida');
      expect(names).not.toContain('Siamês');
    });

    it('should return breeds ordered by name when filtered', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/breeds?speciesId=${gatoSpeciesId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const names = response.body.map((b: any) => b.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
      expect(names).toContain('Siamês');
      expect(names).toContain('Persa');
    });

    it('should return empty list for valid but nonexistent speciesId', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/api/breeds?speciesId=${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 400 for invalid speciesId format', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/breeds?speciesId=invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('GET /api/breeds/:id', () => {
    it('should return breed by id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/breeds/${breedId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(breedId);
      expect(response.body.name).toBe('Labrador Retriever');
      expect(response.body.speciesId).toBe(caoSpeciesId);
      expect(response.body.species.name).toBe('Cão');
    });

    it('should return 404 for nonexistent id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/breeds/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid uuid format', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/breeds/invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without access token', async () => {
      await request(app.getHttpServer()).get('/api/breeds').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/breeds')
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
        .get('/api/breeds')
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
        .get('/api/breeds')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Breeds is global', () => {
    it('should return the same breeds to different tenants', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const response1 = await request(app.getHttpServer())
        .get('/api/breeds')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/breeds')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      const ids1 = response1.body.map((b: any) => b.id).sort();
      const ids2 = response2.body.map((b: any) => b.id).sort();

      expect(ids1).toEqual(ids2);
      expect(ids1.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Breed → Species relationship', () => {
    it('should return correct species for each breed', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/breeds')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const labrador = response.body.find((b: any) => b.name === 'Labrador Retriever');
      const siames = response.body.find((b: any) => b.name === 'Siamês');

      expect(labrador.species.name).toBe('Cão');
      expect(labrador.species.id).toBe(caoSpeciesId);
      expect(siames.species.name).toBe('Gato');
      expect(siames.species.id).toBe(gatoSpeciesId);
    });
  });

  describe('No mutation endpoints', () => {
    it('should return 404 for POST /api/breeds', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/breeds')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Test', speciesId: caoSpeciesId })
        .expect(404);
    });

    it('should return 404 for PATCH /api/breeds/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch(`/api/breeds/${breedId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 404 for DELETE /api/breeds/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete(`/api/breeds/${breedId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });
});
