import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
  registerUser,
  setUserRole,
  getPrisma,
} from './helpers';

describe('CLINICAL RBAC', () => {
  let app: INestApplication;
  let caoSpeciesId: string;
  let caoBreedId: string;

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

    return response.body as { id: string };
  }

  async function createAllergy(name: string) {
    const prisma = getPrisma(app);
    return prisma.allergy.create({
      data: { name },
    });
  }

  async function createMedication(name: string) {
    const prisma = getPrisma(app);
    return prisma.medication.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  async function createVaccine(name: string) {
    const prisma = getPrisma(app);
    return prisma.vaccine.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  async function createConsultation(
    user: { accessToken: string },
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

  describe('RECEPTIONIST', () => {
    it('should deny POST on clinical write endpoints', async () => {
      const user = await registerUser(app, {
        email: 'receptionist@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const consultation = await createConsultation(
        user,
        animal.animal.id,
        vet.id,
      );
      const allergy = await createAllergy('Pólen');
      const medication = await createMedication('Amoxicilina');
      const vaccine = await createVaccine('Vacina antirrábica');

      await setUserRole(app, user, 'RECEPTIONIST');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ weight: 10.0 })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ allergyId: allergy.id })
        .expect(403);

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

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ description: 'Tentativa' })
        .expect(403);
    });

    it('should allow GET on clinical record endpoints', async () => {
      const user = await registerUser(app, {
        email: 'receptionist@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      await createConsultation(user, animal.animal.id, vet.id);

      await setUserRole(app, user, 'RECEPTIONIST');

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/weight`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/medications`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);
    });

    it('should allow POST, GET and PATCH on /appointments', async () => {
      const user = await registerUser(app, {
        email: 'receptionist@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      await setUserRole(app, user, 'RECEPTIONIST');

      const createResponse = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/appointments/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);
    });
  });

  describe('VETERINARIAN', () => {
    it('should allow POST on /consultations and on consultation diagnoses', async () => {
      const user = await registerUser(app, {
        email: 'veterinarian@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      await setUserRole(app, user, 'VETERINARIAN');

      const consultation = await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/consultations/${consultation.body.id}/diagnoses`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ description: 'Gastrite aguda' })
        .expect(201);
    });
  });

  describe('ADMIN', () => {
    it('should allow POST on /consultations', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(201);
    });
  });

  describe('User without any role', () => {
    it('should deny POST on /appointments', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'norole@test.com',
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
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: '00000000-0000-4000-8000-000000000000',
          veterinarianId: '00000000-0000-4000-8000-000000000000',
          scheduledAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(403);
    });
  });
});
