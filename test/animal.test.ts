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

describe('ANIMALS', () => {
  let app: INestApplication;
  let caoSpeciesId: string;
  let gatoSpeciesId: string;
  let caoBreedId: string;
  let gatoBreedId: string;

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

    const caoDefaultBreed = await prisma.breed.upsert({
      where: { speciesId_name: { speciesId: caoSpeciesId, name: 'Sem raça definida' } },
      update: {},
      create: { speciesId: caoSpeciesId, name: 'Sem raça definida' },
    });

    const gatoDefaultBreed = await prisma.breed.upsert({
      where: { speciesId_name: { speciesId: gatoSpeciesId, name: 'Sem raça definida' } },
      update: {},
      create: { speciesId: gatoSpeciesId, name: 'Sem raça definida' },
    });

    const caoBreed = await prisma.breed.upsert({
      where: { speciesId_name: { speciesId: caoSpeciesId, name: 'Labrador Retriever' } },
      update: {},
      create: { speciesId: caoSpeciesId, name: 'Labrador Retriever' },
    });
    caoBreedId = caoBreed.id;

    const gatoBreed = await prisma.breed.upsert({
      where: { speciesId_name: { speciesId: gatoSpeciesId, name: 'Siamês' } },
      update: {},
      create: { speciesId: gatoSpeciesId, name: 'Siamês' },
    });
    gatoBreedId = gatoBreed.id;
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(app);
    await seedRolesAndPermissions(app);
  });

  describe('POST /api/animals', () => {
    it('should create an animal with all required fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.animal.internalCode).toMatch(/^ANI-\d{6}$/);
      expect(response.body.animal.name).toBe('Rex');
      expect(response.body.animal.species.id).toBe(caoSpeciesId);
      expect(response.body.animal.breed.id).toBe(caoBreedId);
      expect(response.body.animal.sex).toBe('MALE');
      expect(response.body.status).toBe('ACTIVE');
    });

    it('should create an animal without breed', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Mia',
          speciesId: gatoSpeciesId,
          sex: 'FEMALE',
        })
        .expect(201);

      expect(response.body.animal.name).toBe('Mia');
      expect(response.body.animal.species.id).toBe(gatoSpeciesId);
    });

    it('should return 404 for invalid speciesId', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: fakeId,
          sex: 'MALE',
        })
        .expect(404);
    });

    it('should return 404 for invalid breedId', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: fakeId,
          sex: 'MALE',
        })
        .expect(404);
    });

    it('should return 409 for breed incompatible with species', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: gatoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(409);
    });

    it('should return 409 for duplicate microchip', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
          microchip: '123456789012345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex 2',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
          microchip: '123456789012345',
        })
        .expect(409);
    });

    it('should generate sequential internalCode', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response1 = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex 1',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex 2',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      expect(response1.body.animal.internalCode).not.toBe(
        response2.body.animal.internalCode,
      );
    });

    it('should return 400 for missing required fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/animals')
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(401);
    });

    it('should auto-associate animal to tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();

      const prisma = getPrisma(app);
      const tenantAnimal = await prisma.tenantAnimal.findFirst({
        where: {
          tenantId: user.tenantId,
          animalId: response.body.animal.id,
        },
      });

      expect(tenantAnimal).not.toBeNull();
    });
  });

  describe('GET /api/animals', () => {
    it('should list animals for authenticated tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].animal.name).toBe('Rex');
    });

    it('should only return active associations', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/animals').expect(401);
    });
  });

  describe('GET /api/animals/:id', () => {
    it('should return animal by id', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${createResponse.body.animal.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.animal.name).toBe('Rex');
      expect(response.body.animal.internalCode).toMatch(/^ANI-\d{6}$/);
    });

    it('should return 404 for nonexistent id', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/animals/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid uuid', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/animals/invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/animals/:id', () => {
    it('should update animal fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex Updated',
          color: 'Brown',
          size: 'LARGE',
        })
        .expect(200);

      expect(response.body.animal.name).toBe('Rex Updated');
      expect(response.body.animal.color).toBe('Brown');
      expect(response.body.animal.size).toBe('LARGE');
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .patch(`/api/animals/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should not allow changing internalCode', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ internalCode: 'ANI-999999' })
        .expect(400);
    });

    it('should return 409 when changing breed to incompatible species', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          speciesId: gatoSpeciesId,
          breedId: caoBreedId,
        })
        .expect(409);
    });

    it('should return 409 for duplicate microchip', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex 1',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
          microchip: '123456789012345',
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex 2',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${response2.body.animal.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          microchip: '123456789012345',
        })
        .expect(409);
    });
  });

  describe('PATCH /api/animals/:id/deactivate', () => {
    it('should deactivate tenant animal association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('INACTIVE');
    });

    it('should return 400 if already deactivated', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .patch(`/api/animals/${fakeId}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('Multi-tenancy', () => {
    it('should prevent Tenant B from seeing Tenant A animals', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/animals')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should return 404 when Tenant B tries to access Tenant A animal', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/animals/${createResponse.body.animal.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 404 when Tenant B tries to update Tenant A animal', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('should return 404 when Tenant B tries to deactivate Tenant A animal', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${createResponse.body.animal.id}/deactivate`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should allow same animal in different tenants', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      await request(app.getHttpServer())
        .post(`/api/animals/${animalId}/clinic`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(201);

      const responseA = await request(app.getHttpServer())
        .get(`/api/animals/${animalId}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get(`/api/animals/${animalId}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.animal.id).toBe(animalId);
      expect(responseB.body.animal.id).toBe(animalId);
      expect(responseA.body.id).not.toBe(responseB.body.id);
    });

    it('should not leak tenant-scoped data between tenants', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      await request(app.getHttpServer())
        .post(`/api/animals/${animalId}/clinic`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(201);

      const responseA = await request(app.getHttpServer())
        .get(`/api/animals/${animalId}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get(`/api/animals/${animalId}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.id).not.toBe(responseB.body.id);
      expect(responseA.body.animal.id).toBe(responseB.body.animal.id);
    });
  });

  describe('TenantAnimal', () => {
    it('should associate animal to clinic', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animalId}/clinic`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(201);

      expect(response.body.animal.id).toBe(animalId);
      expect(response.body.status).toBe('ACTIVE');
    });

    it('should return 409 for duplicate association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      await request(app.getHttpServer())
        .post(`/api/animals/${animalId}/clinic`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(409);
    });

    it('should get tenant animal association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animalId}/clinic`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.animal.id).toBe(animalId);
      expect(response.body.status).toBe('ACTIVE');
    });

    it('should return 404 for nonexistent association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/animals/${fakeId}/clinic`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should update tenant-scoped notes', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/animals/${animalId}/clinic`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ notes: 'Private clinic notes' })
        .expect(200);

      expect(response.body.notes).toBe('Private clinic notes');
    });

    it('should deactivate tenant animal association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/animals/${animalId}/clinic/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('INACTIVE');
    });

    it('should return 404 when Tenant B tries to get Tenant A association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      await request(app.getHttpServer())
        .get(`/api/animals/${animalId}/clinic`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 404 when Tenant B tries to update Tenant A association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      await request(app.getHttpServer())
        .patch(`/api/animals/${animalId}/clinic`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ notes: 'Hacked' })
        .expect(404);
    });

    it('should return 404 when Tenant B tries to deactivate Tenant A association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const animalId = createResponse.body.animal.id;

      await request(app.getHttpServer())
        .patch(`/api/animals/${animalId}/clinic/deactivate`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });
  });

  describe('Permissions', () => {
    it('should return 403 for ANIMAL_CREATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
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
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(403);
    });

    it('should return 403 for ANIMAL_READ without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
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
        .get('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it('should return 403 for ANIMAL_UPDATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

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
        .patch(`/api/animals/${createResponse.body.animal.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(403);
    });

    it('should return 403 for ANIMAL_DEACTIVATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

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
        .patch(`/api/animals/${createResponse.body.animal.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Authentication', () => {
    it('should return 401 for POST without token', async () => {
      await request(app.getHttpServer())
        .post('/api/animals')
        .send({
          name: 'Rex',
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(401);
    });

    it('should return 401 for GET without token', async () => {
      await request(app.getHttpServer()).get('/api/animals').expect(401);
    });

    it('should return 401 for PATCH without token', async () => {
      await request(app.getHttpServer())
        .patch('/api/animals/00000000-0000-4000-8000-000000000000')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/animals')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });
});
