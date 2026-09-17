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

describe('ANIMAL_MEDICATIONS', () => {
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

  async function createMedication(name: string) {
    const prisma = getPrisma(app);
    return prisma.medication.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  async function addAnimalMedication(
    user: { accessToken: string; tenantId: string },
    animalId: string,
    medicationId: string,
    overrides?: { dosage?: string; frequency?: string; route?: string; startDate?: string; endDate?: string; notes?: string },
  ) {
    const body: Record<string, unknown> = {
      medicationId,
      dosage: '500mg',
      frequency: '2x ao dia',
      startDate: '2025-01-15T00:00:00.000Z',
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post(`/api/animals/${animalId}/medications`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(body)
      .expect(201);

    return response.body;
  }

  describe('POST /api/animals/:animalId/medications', () => {
    it('should register a medication for an animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const medication = await createMedication('Amoxicilina');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.medication.id).toBe(medication.id);
      expect(response.body.medication.name).toBe('Amoxicilina');
      expect(response.body.animal.id).toBe(animal.animal.id);
      expect(response.body.dosage).toBe('500mg');
      expect(response.body.frequency).toBe('2x ao dia');
      expect(response.body.startDate).toBe('2025-01-15T00:00:00.000Z');
      expect(response.body.endDate).toBeNull();
      expect(response.body.registeredByTenantId).toBe(user.tenantId);
      expect(response.body.registeredByUserId).toBe(user.userId);
      expect(response.body).toHaveProperty('registeredAt');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should register a medication with optional fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const medication = await createMedication('Amoxicilina');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '250mg',
          frequency: '3x ao dia',
          route: 'oral',
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-01-25T00:00:00.000Z',
          notes: 'Tomar com alimento',
        })
        .expect(201);

      expect(response.body.dosage).toBe('250mg');
      expect(response.body.frequency).toBe('3x ao dia');
      expect(response.body.route).toBe('oral');
      expect(response.body.startDate).toBe('2025-01-15T00:00:00.000Z');
      expect(response.body.endDate).toBe('2025-01-25T00:00:00.000Z');
      expect(response.body.notes).toBe('Tomar com alimento');
    });

    it('should allow duplicate medication records for same animal (historical)', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const medication = await createMedication('Amoxicilina');

      await addAnimalMedication(user, animal.animal.id, medication.id, {
        startDate: '2025-01-15T00:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '1x ao dia',
          startDate: '2025-06-01T00:00:00.000Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
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
      const medication = await createMedication('Amoxicilina');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const medication = await createMedication('Amoxicilina');
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for nonexistent medication', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const fakeMedicationId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: fakeMedicationId,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 400 for invalid animal UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const medication = await createMedication('Amoxicilina');

      await request(app.getHttpServer())
        .post('/api/animals/invalid-uuid/medications')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should return 400 for invalid medication UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: 'invalid-uuid',
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const medication = await createMedication('Amoxicilina');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
        })
        .expect(400);
    });

    it('should return 400 when tenantId is sent in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const medication = await createMedication('Amoxicilina');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
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
      const medication = await createMedication('Amoxicilina');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
          animalId: 'some-animal-id',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/medications`)
        .send({
          medicationId: '00000000-0000-4000-8000-000000000000',
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
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
      const medication = await createMedication('Amoxicilina');

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
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(403);
    });
  });

  describe('GET /api/animals/:animalId/medications', () => {
    it('should list medications for the animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const med1 = await createMedication('Amoxicilina');
      const med2 = await createMedication('Meloxicam');

      await addAnimalMedication(user, animal.animal.id, med1.id);
      await addAnimalMedication(user, animal.animal.id, med2.id);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return medications ordered by registeredAt desc', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const med1 = await createMedication('Amoxicilina');
      const med2 = await createMedication('Meloxicam');
      const med3 = await createMedication('Dipirona');

      await addAnimalMedication(user, animal.animal.id, med1.id);
      await addAnimalMedication(user, animal.animal.id, med2.id);
      await addAnimalMedication(user, animal.animal.id, med3.id);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body[0].medication.name).toBe('Dipirona');
      expect(response.body[1].medication.name).toBe('Meloxicam');
      expect(response.body[2].medication.name).toBe('Amoxicilina');
    });

    it('should return empty array for animal with no medications', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/medications`)
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
        .get(`/api/animals/${animal.animal.id}/medications`)
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
        .get(`/api/animals/${fakeAnimalId}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/animals/${fakeAnimalId}/medications`)
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
        .get(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Multi-tenancy', () => {
    it('should show global medications to both tenants with access', async () => {
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

      const medication = await createMedication('Amoxicilina');
      await addAnimalMedication(userA, animal.animal.id, medication.id);

      const responseA = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.length).toBe(1);
      expect(responseB.body.length).toBe(1);
      expect(responseA.body[0].id).toBe(responseB.body[0].id);
    });

    it('should prevent Tenant B from adding medication for Tenant A animal without association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const medication = await createMedication('Amoxicilina');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          medicationId: medication.id,
          dosage: '500mg',
          frequency: '2x ao dia',
          startDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(404);
    });

    it('should prevent Tenant B from reading medications for Tenant A animal without association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const medication = await createMedication('Amoxicilina');
      await addAnimalMedication(userA, animal.animal.id, medication.id);

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should record tenantId as provenance of who registered the medication', async () => {
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

      const med1 = await createMedication('Amoxicilina');
      const med2 = await createMedication('Meloxicam');

      await addAnimalMedication(userA, animalA.animal.id, med1.id);
      await addAnimalMedication(userB, animalA.animal.id, med2.id);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animalA.animal.id}/medications`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(2);

      const recordA = response.body.find(
        (r: { registeredByTenantId: string }) =>
          r.registeredByTenantId === userA.tenantId,
      );
      const recordB = response.body.find(
        (r: { registeredByTenantId: string }) =>
          r.registeredByTenantId === userB.tenantId,
      );

      expect(recordA).toBeDefined();
      expect(recordB).toBeDefined();
    });
  });

  describe('No DELETE endpoint', () => {
    it('should return 404 for DELETE /api/animals/:animalId/medications', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const medication = await createMedication('Amoxicilina');
      await addAnimalMedication(user, animal.animal.id, medication.id);

      await request(app.getHttpServer())
        .delete(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('No PATCH endpoint', () => {
    it('should return 404 for PATCH /api/animals/:animalId/medications', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const medication = await createMedication('Amoxicilina');
      await addAnimalMedication(user, animal.animal.id, medication.id);

      await request(app.getHttpServer())
        .patch(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ dosage: '1000mg' })
        .expect(404);
    });
  });
});
