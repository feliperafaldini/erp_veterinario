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

describe('ANIMAL_TUTORS', () => {
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

  async function createTutor(
    user: { accessToken: string; tenantId: string },
    cpf: string,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/tutors')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: `Tutor ${cpf}`,
        documentType: 'CPF',
        documentNumber: cpf,
      })
      .expect(201);

    return response.body;
  }

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

  describe('POST /api/animals/:animalId/tutors', () => {
    it('should create an animal-tutor association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.isActive).toBe(true);
      expect(response.body.endedAt).toBeNull();
      expect(response.body.tutor.id).toBe(tutor.id);
      expect(response.body.animal.id).toBe(animal.animal.id);
    });

    it('should create association with custom startedAt', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      const customDate = '2025-06-15T10:00:00.000Z';
      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
          startedAt: customDate,
        })
        .expect(201);

      expect(response.body.startedAt).toBe(customDate);
    });

    it('should create association with notes', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
          notes: 'Tutor principal do animal',
        })
        .expect(201);

      expect(response.body.notes).toBe('Tutor principal do animal');
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
      const tutor = await createTutor(userB, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(404);
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const tutor = await createTutor(user, '12345678901');
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(404);
    });

    it('should return 404 for tutor not in current clinic', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const tutor = await createTutor(userB, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(404);
    });

    it('should return 404 for nonexistent tutor', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const fakeTutorId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: fakeTutorId,
        })
        .expect(404);
    });

    it('should return 400 for invalid animal UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post('/api/animals/invalid-uuid/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(400);
    });

    it('should return 400 for invalid tutor UUID in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: 'invalid-uuid',
        })
        .expect(400);
    });

    it('should return 400 for missing tutorId', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 when tenantId is sent in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
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
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
          animalId: 'some-animal-id',
        })
        .expect(400);
    });

    it('should return 409 for duplicate active association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(409);
    });

    it('should allow re-creating association after deactivation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animal.animal.id}/tutors/${tutor.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      expect(response.body.isActive).toBe(true);
      expect(response.body.endedAt).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/tutors`)
        .send({
          tutorId: '00000000-0000-4000-8000-000000000000',
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
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: '00000000-0000-4000-8000-000000000000',
        })
        .expect(403);
    });
  });

  describe('GET /api/animals/:animalId/tutors', () => {
    it('should list associations for the tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].tutor.id).toBe(tutor.id);
      expect(response.body[0].animal.id).toBe(animal.animal.id);
    });

    it('should return empty array for animal with no associations', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/tutors`)
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
        .get(`/api/animals/${animal.animal.id}/tutors`)
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
        .get(`/api/animals/${fakeAnimalId}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/animals/${fakeAnimalId}/tutors`)
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
        .get(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/animals/:animalId/tutors/:tutorId', () => {
    it('should update notes', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/animals/${animal.animal.id}/tutors/${tutor.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          notes: 'Updated notes',
        })
        .expect(200);

      expect(response.body.notes).toBe('Updated notes');
    });

    it('should return 404 for nonexistent association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .patch(`/api/animals/${animal.animal.id}/tutors/${tutor.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          notes: 'Updated',
        })
        .expect(404);
    });

    it('should return 404 when updating association from another tenant', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const tutorA = await createTutor(userA, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animalA.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          tutorId: tutorA.id,
        })
        .expect(201);

      const animalB = await createAnimal(userB);
      const tutorB = await createTutor(userB, '98765432100');

      await request(app.getHttpServer())
        .patch(`/api/animals/${animalB.animal.id}/tutors/${tutorA.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          notes: 'Hacked',
        })
        .expect(404);
    });

    it('should return 400 when trying to set endedAt on active association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${animal.animal.id}/tutors/${tutor.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          endedAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should return 400 when startedAt is after endedAt', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
          startedAt: '2026-01-01T00:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/animals/${animal.animal.id}/tutors/${tutor.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          startedAt: '2026-12-31T00:00:00.000Z',
          endedAt: '2026-01-01T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';
      const fakeTutorId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .patch(`/api/animals/${fakeAnimalId}/tutors/${fakeTutorId}`)
        .send({ notes: 'test' })
        .expect(401);
    });
  });

  describe('PATCH /api/animals/:animalId/tutors/:tutorId/deactivate', () => {
    it('should deactivate association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(
          `/api/animals/${animal.animal.id}/tutors/${tutor.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.endedAt).not.toBeNull();
    });

    it('should preserve record in database after deactivation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animal.animal.id}/tutors/${tutor.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const prisma = getPrisma(app);
      const record = await prisma.animalTutor.findFirst({
        where: {
          tenantId: user.tenantId,
          animalId: animal.animal.id,
          tutorId: tutor.id,
        },
      });

      expect(record).not.toBeNull();
      expect(record!.isActive).toBe(false);
      expect(record!.endedAt).not.toBeNull();
    });

    it('should return 400 if already deactivated', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animal.animal.id}/tutors/${tutor.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animal.animal.id}/tutors/${tutor.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });

    it('should return 404 for nonexistent association', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animal.animal.id}/tutors/${tutor.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 when deactivating association from another tenant', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const tutorA = await createTutor(userA, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animalA.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          tutorId: tutorA.id,
        })
        .expect(201);

      const animalB = await createAnimal(userB);

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animalB.animal.id}/tutors/${tutorA.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';
      const fakeTutorId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${fakeAnimalId}/tutors/${fakeTutorId}/deactivate`,
        )
        .expect(401);
    });
  });

  describe('History', () => {
    it('should preserve history when tutor changes', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutorJoao = await createTutor(user, '11111111111');
      const tutorMaria = await createTutor(user, '22222222222');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutorJoao.id,
          startedAt: '2026-01-01T00:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animal.animal.id}/tutors/${tutorJoao.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutorMaria.id,
          startedAt: '2026-06-15T00:00:00.000Z',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(2);

      const joaoAssoc = response.body.find(
        (a: { tutor: { id: string } }) => a.tutor.id === tutorJoao.id,
      );
      const mariaAssoc = response.body.find(
        (a: { tutor: { id: string } }) => a.tutor.id === tutorMaria.id,
      );

      expect(joaoAssoc.isActive).toBe(false);
      expect(joaoAssoc.endedAt).not.toBeNull();
      expect(mariaAssoc.isActive).toBe(true);
      expect(mariaAssoc.endedAt).toBeNull();
    });

    it('should allow same tutor again after deactivation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutor = await createTutor(user, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
          startedAt: '2026-01-01T00:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animal.animal.id}/tutors/${tutor.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          tutorId: tutor.id,
          startedAt: '2026-09-01T00:00:00.000Z',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(2);

      const oldAssoc = response.body.find(
        (a: { isActive: boolean }) => a.isActive === false,
      );
      const newAssoc = response.body.find(
        (a: { isActive: boolean }) => a.isActive === true,
      );

      expect(oldAssoc).toBeDefined();
      expect(newAssoc).toBeDefined();
      expect(newAssoc.endedAt).toBeNull();
    });
  });

  describe('Multiple tutors', () => {
    it('should allow multiple tutors for the same animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const tutorA = await createTutor(user, '11111111111');
      const tutorB = await createTutor(user, '22222222222');
      const tutorC = await createTutor(user, '33333333333');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ tutorId: tutorA.id })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ tutorId: tutorB.id })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ tutorId: tutorC.id })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/tutors`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body.every((a: { isActive: boolean }) => a.isActive)).toBe(
        true,
      );
    });
  });

  describe('Multi-tenancy', () => {
    it('should not show Tenant A associations to Tenant B', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const tutorA = await createTutor(userA, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animalA.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ tutorId: tutorA.id })
        .expect(201);

      const animalB = await createAnimal(userB);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animalB.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should prevent Tenant B from creating association with Tenant A tutor', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalB = await createAnimal(userB);
      const tutorA = await createTutor(userA, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animalB.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ tutorId: tutorA.id })
        .expect(404);
    });

    it('should prevent Tenant B from updating Tenant A association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const tutorA = await createTutor(userA, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animalA.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ tutorId: tutorA.id })
        .expect(201);

      const animalB = await createAnimal(userB);

      await request(app.getHttpServer())
        .patch(`/api/animals/${animalB.animal.id}/tutors/${tutorA.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ notes: 'Hacked' })
        .expect(404);
    });

    it('should prevent Tenant B from deactivating Tenant A association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const tutorA = await createTutor(userA, '12345678901');

      await request(app.getHttpServer())
        .post(`/api/animals/${animalA.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({ tutorId: tutorA.id })
        .expect(201);

      const animalB = await createAnimal(userB);

      await request(app.getHttpServer())
        .patch(
          `/api/animals/${animalB.animal.id}/tutors/${tutorA.id}/deactivate`,
        )
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should prevent Tenant B from creating association for Tenant A animal', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const tutorB = await createTutor(userB, '98765432100');

      await request(app.getHttpServer())
        .post(`/api/animals/${animalA.animal.id}/tutors`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ tutorId: tutorB.id })
        .expect(404);
    });
  });
});
