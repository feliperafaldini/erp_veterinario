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

describe('ANIMAL_WEIGHT_RECORDS', () => {
  let app: INestApplication;
  let caoSpeciesId: string;
  let caoBreedId: string;

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

    const caoDefaultBreed = await prisma.breed.upsert({
      where: {
        speciesId_name: { speciesId: caoSpeciesId, name: 'Sem raça definida' },
      },
      update: {},
      create: { speciesId: caoSpeciesId, name: 'Sem raça definida' },
    });
    caoBreedId = caoDefaultBreed.id;
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(app);
    await seedRolesAndPermissions(app);
  });

  async function createAnimal(user: { accessToken: string; tenantId: string }) {
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

    return response.body;
  }

  async function createWeightRecord(
    user: { accessToken: string; tenantId: string },
    animalId: string,
    weight: number,
    recordedAt?: string,
  ) {
    const body: Record<string, unknown> = { weight };
    if (recordedAt) body.recordedAt = recordedAt;

    const response = await request(app.getHttpServer())
      .post(`/api/animals/${animalId}/weight`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(body)
      .expect(201);

    return response.body;
  }

  describe('POST /api/animals/:animalId/weight', () => {
    it('should create a weight record', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 12.5,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.weight).toBe('12.5');
      expect(response.body.animal.id).toBe(animal.animal.id);
      expect(response.body.tenantId).toBe(user.tenantId);
      expect(response.body.recordedBy).toBe(user.userId);
      expect(response.body).toHaveProperty('recordedAt');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should create a weight record with decimal weight', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 12.55,
        })
        .expect(201);

      expect(response.body.weight).toBe('12.55');
    });

    it('should create a weight record with custom recordedAt', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const customDate = '2026-01-15T10:00:00.000Z';
      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 10.0,
          recordedAt: customDate,
        })
        .expect(201);

      expect(response.body.recordedAt).toBe(customDate);
    });

    it('should create a weight record with notes', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 15.0,
          notes: 'Pesagem antes da vacinação',
        })
        .expect(201);

      expect(response.body.notes).toBe('Pesagem antes da vacinação');
    });

    it('should return 404 for animal not associated with clinic', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          weight: 10.0,
        })
        .expect(404);
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 10.0,
        })
        .expect(404);
    });

    it('should return 400 for invalid animal UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/animals/invalid-uuid/weight')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 10.0,
        })
        .expect(400);
    });

    it('should return 400 for missing weight', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 for zero weight', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 0,
        })
        .expect(400);
    });

    it('should return 400 for negative weight', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: -5.0,
        })
        .expect(400);
    });

    it('should return 400 for string weight', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 'not-a-number',
        })
        .expect(400);
    });

    it('should return 400 for weight exceeding max', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 100000,
        })
        .expect(400);
    });

    it('should return 400 when tenantId is sent in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 10.0,
          tenantId: 'some-tenant-id',
        })
        .expect(400);
    });

    it('should return 400 when animalId is sent in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 10.0,
          animalId: 'some-animal-id',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/weight`)
        .send({
          weight: 10.0,
        })
        .expect(401);
    });

    it('should return 403 without ANIMAL_UPDATE permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

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
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          weight: 10.0,
        })
        .expect(403);
    });
  });

  describe('GET /api/animals/:animalId/weight', () => {
    it('should list weight records for the animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await createWeightRecord(user, animal.animal.id, 10.0);
      await createWeightRecord(user, animal.animal.id, 12.5);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return weight records ordered by recordedAt desc', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await createWeightRecord(
        user,
        animal.animal.id,
        10.0,
        '2026-01-01T00:00:00.000Z',
      );
      await createWeightRecord(
        user,
        animal.animal.id,
        12.5,
        '2026-03-01T00:00:00.000Z',
      );
      await createWeightRecord(
        user,
        animal.animal.id,
        11.0,
        '2026-02-01T00:00:00.000Z',
      );

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body[0].weight).toBe('12.5');
      expect(response.body[1].weight).toBe('11');
      expect(response.body[2].weight).toBe('10');
    });

    it('should return empty array for animal with no weight records', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 404 for animal not associated with clinic', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/animals/${fakeAnimalId}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/animals/${fakeAnimalId}/weight`)
        .expect(401);
    });

    it('should return 403 without ANIMAL_READ permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

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
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('History', () => {
    it('should preserve all weight records as history', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await createWeightRecord(
        user,
        animal.animal.id,
        10.0,
        '2026-01-01T00:00:00.000Z',
      );
      await createWeightRecord(
        user,
        animal.animal.id,
        10.5,
        '2026-02-01T00:00:00.000Z',
      );
      await createWeightRecord(
        user,
        animal.animal.id,
        11.2,
        '2026-03-01T00:00:00.000Z',
      );
      await createWeightRecord(
        user,
        animal.animal.id,
        11.0,
        '2026-04-01T00:00:00.000Z',
      );

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(4);

      const weights = response.body.map((r: { weight: string }) =>
        parseFloat(r.weight),
      );
      expect(weights).toEqual([11, 11.2, 10.5, 10]);
    });

    it('should not alter previous records when adding a new one', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const record1 = await createWeightRecord(
        user,
        animal.animal.id,
        10.0,
        '2026-01-01T00:00:00.000Z',
      );

      await createWeightRecord(
        user,
        animal.animal.id,
        12.0,
        '2026-02-01T00:00:00.000Z',
      );

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const firstRecord = response.body.find(
        (r: { id: string }) => r.id === record1.id,
      );
      expect(firstRecord.weight).toBe('10');
    });
  });

  describe('Multi-tenancy', () => {
    it('should show global weight history to both tenants with access', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);

      await request(app.getHttpServer())
        .post('/api/animals')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          name: animal.animal.name,
          speciesId: caoSpeciesId,
          breedId: caoBreedId,
          sex: 'MALE',
        })
        .expect(201);

      const prisma = getPrisma(app);
      const tenantB = await prisma.tenant.findFirst({
        where: { userTenants: { some: { userId: userB.userId } } },
      });

      await prisma.tenantAnimal.create({
        data: {
          tenantId: tenantB!.id,
          animalId: animal.animal.id,
        },
      });

      await createWeightRecord(
        userA,
        animal.animal.id,
        10.0,
        '2026-01-01T00:00:00.000Z',
      );

      const responseA = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.length).toBe(1);
      expect(responseB.body.length).toBe(1);
      expect(responseA.body[0].id).toBe(responseB.body[0].id);
    });

    it('should prevent Tenant B from creating weight for Tenant A animal without association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          weight: 10.0,
        })
        .expect(404);
    });

    it('should prevent Tenant B from reading weight for Tenant A animal without association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);

      await createWeightRecord(userA, animal.animal.id, 10.0);

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should record tenantId as provenance of who registered the weight', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);

      const prisma = getPrisma(app);
      const tenantB = await prisma.tenant.findFirst({
        where: { userTenants: { some: { userId: userB.userId } } },
      });

      await prisma.tenantAnimal.create({
        data: {
          tenantId: tenantB!.id,
          animalId: animalA.animal.id,
        },
      });

      await createWeightRecord(
        userA,
        animalA.animal.id,
        10.0,
        '2026-01-01T00:00:00.000Z',
      );
      await createWeightRecord(
        userB,
        animalA.animal.id,
        12.0,
        '2026-02-01T00:00:00.000Z',
      );

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animalA.animal.id}/weight`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(2);

      const recordA = response.body.find(
        (r: { tenantId: string }) => r.tenantId === userA.tenantId,
      );
      const recordB = response.body.find(
        (r: { tenantId: string }) => r.tenantId === userB.tenantId,
      );

      expect(recordA).toBeDefined();
      expect(recordB).toBeDefined();
    });
  });

  describe('No DELETE endpoint', () => {
    it('should return 404 for DELETE /api/animals/:animalId/weight', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .delete(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('No PATCH endpoint', () => {
    it('should return 404 for PATCH /api/animals/:animalId/weight', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .patch(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ weight: 20.0 })
        .expect(404);
    });
  });
});
