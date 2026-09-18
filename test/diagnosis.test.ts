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

describe('DIAGNOSIS', () => {
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

  async function createVeterinarian(
    user: { accessToken: string; tenantId: string },
    name = 'Dr. Silva',
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/veterinarians')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name,
        crmv: `CRMV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })
      .expect(201);

    return response.body as { id: string; veterinarian: { id: string } };
  }

  async function createConsultation(
    user: { accessToken: string; tenantId: string },
    animalId: string,
    veterinarianId: string,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/consultations')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        animalId,
        veterinarianId,
        startedAt: '2025-06-01T10:00:00.000Z',
      })
      .expect(201);

    return response.body;
  }

  async function createDiagnosis(
    user: { accessToken: string; tenantId: string },
    consultationId: string,
    overrides?: { description?: string; notes?: string },
  ) {
    const body: Record<string, unknown> = {
      description: 'Gastrite aguda',
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post(`/api/consultations/${consultationId}/diagnoses`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(body)
      .expect(201);

    return response.body;
  }

  describe('POST /api/consultations/:consultationId/diagnoses', () => {
    it('should create a diagnosis', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      const response = await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          description: 'Gastrite aguda',
          notes: 'Prescrição: ranitidina',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.description).toBe('Gastrite aguda');
      expect(response.body.notes).toBe('Prescrição: ranitidina');
      expect(response.body.isActive).toBe(true);
      expect(response.body.consultation.id).toBe(consultation.id);
      expect(response.body.animal.id).toBe(animal.animal.id);
      expect(response.body.veterinarian.id).toBe(vet.id);
      expect(response.body).toHaveProperty('registeredAt');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create a diagnosis without notes', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      const response = await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          description: 'Otite externa',
        })
        .expect(201);

      expect(response.body.description).toBe('Otite externa');
      expect(response.body.notes).toBeNull();
    });

    it('should use animalId and veterinarianId from consultation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      const response = await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          description: 'Dermatite',
        })
        .expect(201);

      expect(response.body.animal.id).toBe(animal.animal.id);
      expect(response.body.veterinarian.id).toBe(vet.id);
    });

    it('should return 404 for nonexistent consultation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/consultations/${fakeId}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          description: 'Teste',
        })
        .expect(404);
    });

    it('should return 404 for consultation from another tenant', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const vetA = await createVeterinarian(userA);
      const consultation = await createConsultation(
        userA,
        animalA.animal.id,
        vetA.id,
      );

      await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          description: 'Tentativa cross-tenant',
        })
        .expect(404);
    });

    it('should return 400 when tenantId is sent in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          description: 'Teste',
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
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          description: 'Teste',
          animalId: '00000000-0000-4000-8000-000000000000',
        })
        .expect(400);
    });

    it('should return 400 when veterinarianId is sent in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          description: 'Teste',
          veterinarianId: '00000000-0000-4000-8000-000000000000',
        })
        .expect(400);
    });

    it('should return 400 for missing description', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/consultations/00000000-0000-4000-8000-000000000000/diagnoses')
        .send({
          description: 'Teste',
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
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

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
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          description: 'Teste',
        })
        .expect(403);
    });
  });

  describe('GET /api/consultations/:consultationId/diagnoses', () => {
    it('should list diagnoses for a consultation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      await createDiagnosis(user, consultation.id, {
        description: 'Diagnóstico 1',
      });
      await createDiagnosis(user, consultation.id, {
        description: 'Diagnóstico 2',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return empty array for consultation with no diagnoses', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      const response = await request(app.getHttpServer())
        .get(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return diagnoses ordered by registeredAt desc', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

      await createDiagnosis(user, consultation.id, {
        description: 'Primeiro',
      });
      await createDiagnosis(user, consultation.id, {
        description: 'Segundo',
      });
      await createDiagnosis(user, consultation.id, {
        description: 'Terceiro',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body[0].description).toBe('Terceiro');
      expect(response.body[1].description).toBe('Segundo');
      expect(response.body[2].description).toBe('Primeiro');
    });

    it('should return 404 for consultation from another tenant', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const vetA = await createVeterinarian(userA);
      const consultation = await createConsultation(
        userA,
        animalA.animal.id,
        vetA.id,
      );

      await request(app.getHttpServer())
        .get(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/consultations/00000000-0000-4000-8000-000000000000/diagnoses')
        .expect(401);
    });

    it('should return 403 without ANIMAL_READ permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );

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
        .get(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/diagnoses/:id', () => {
    it('should return a diagnosis by id', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

      const response = await request(app.getHttpServer())
        .get(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(diagnosis.id);
      expect(response.body.description).toBe('Gastrite aguda');
    });

    it('should return 404 for nonexistent diagnosis', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/diagnoses/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 for diagnosis from another tenant', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const vetA = await createVeterinarian(userA);
      const consultation = await createConsultation(
        userA,
        animalA.animal.id,
        vetA.id,
      );
      const diagnosis = await createDiagnosis(userA, consultation.id);

      await request(app.getHttpServer())
        .get(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/diagnoses/invalid-uuid')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/diagnoses/00000000-0000-4000-8000-000000000000')
        .expect(401);
    });

    it('should return 403 without ANIMAL_READ permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

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
        .get(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/diagnoses/:id', () => {
    it('should update diagnosis description', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ description: 'Gastrite crônica' })
        .expect(200);

      expect(response.body.description).toBe('Gastrite crônica');
    });

    it('should update diagnosis notes', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ notes: 'Notas atualizadas' })
        .expect(200);

      expect(response.body.notes).toBe('Notas atualizadas');
    });

    it('should return 400 when updating inactive diagnosis', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ description: 'Atualizado' })
        .expect(400);
    });

    it('should return 404 for diagnosis from another tenant', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const vetA = await createVeterinarian(userA);
      const consultation = await createConsultation(
        userA,
        animalA.animal.id,
        vetA.id,
      );
      const diagnosis = await createDiagnosis(userA, consultation.id);

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ description: 'Tentativa cross-tenant' })
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch('/api/diagnoses/invalid-uuid')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ description: 'Teste' })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/api/diagnoses/00000000-0000-4000-8000-000000000000')
        .send({ description: 'Teste' })
        .expect(401);
    });

    it('should return 403 without ANIMAL_UPDATE permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

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
        .patch(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ description: 'Teste' })
        .expect(403);
    });
  });

  describe('PATCH /api/diagnoses/:id/deactivate', () => {
    it('should deactivate a diagnosis', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should return 400 when deactivating already inactive diagnosis', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });

    it('should not allow reactivation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ description: 'Reativado' })
        .expect(400);
    });

    it('should return 404 for diagnosis from another tenant', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const vetA = await createVeterinarian(userA);
      const consultation = await createConsultation(
        userA,
        animalA.animal.id,
        vetA.id,
      );
      const diagnosis = await createDiagnosis(userA, consultation.id);

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}/deactivate`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/api/diagnoses/00000000-0000-4000-8000-000000000000/deactivate')
        .expect(401);
    });

    it('should return 403 without ANIMAL_UPDATE permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

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
        .patch(`/api/diagnoses/${diagnosis.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('DELETE /api/diagnoses/:id (not allowed)', () => {
    it('should return 404 for DELETE on diagnoses collection', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete('/api/diagnoses')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 for DELETE on diagnosis resource', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id);

      await request(app.getHttpServer())
        .delete(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('Multi-tenancy', () => {
    it('should isolate diagnoses between tenants', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const animalB = await createAnimal(userB);
      const vetA = await createVeterinarian(userA);
      const vetB = await createVeterinarian(userB);

      const consultationA = await createConsultation(
        userA,
        animalA.animal.id,
        vetA.id,
      );
      const consultationB = await createConsultation(
        userB,
        animalB.animal.id,
        vetB.id,
      );

      await createDiagnosis(userA, consultationA.id, {
        description: 'Diagnóstico A',
      });
      await createDiagnosis(userB, consultationB.id, {
        description: 'Diagnóstico B',
      });

      const responseA = await request(app.getHttpServer())
        .get(`/api/consultations/${consultationA.id}/diagnoses`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get(`/api/consultations/${consultationB.id}/diagnoses`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.length).toBe(1);
      expect(responseA.body[0].description).toBe('Diagnóstico A');
      expect(responseB.body.length).toBe(1);
      expect(responseB.body[0].description).toBe('Diagnóstico B');
    });

    it('should not allow using consultation from another tenant', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(userA);
      const vetA = await createVeterinarian(userA);
      const consultationA = await createConsultation(
        userA,
        animalA.animal.id,
        vetA.id,
      );

      await request(app.getHttpServer())
        .post(`/api/consultations/${consultationA.id}/diagnoses`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          description: 'Tentativa cross-tenant',
        })
        .expect(404);
    });
  });

  describe('History preservation', () => {
    it('should preserve diagnosis record after deactivation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id, {
        description: 'Gastrite',
        notes: 'Prescrição original',
      });

      await request(app.getHttpServer())
        .patch(`/api/diagnoses/${diagnosis.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.description).toBe('Gastrite');
      expect(response.body.notes).toBe('Prescrição original');
    });

    it('should preserve diagnosis after consultation completion', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const diagnosis = await createDiagnosis(user, consultation.id, {
        description: 'Gastrite',
      });

      await request(app.getHttpServer())
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/diagnoses/${diagnosis.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.description).toBe('Gastrite');
      expect(response.body.consultation.status).toBe('COMPLETED');
    });
  });
});
