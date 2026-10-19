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

describe('INACTIVE CLINIC LINK', () => {
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

  async function setupClinic() {
    const prisma = getPrisma(app);

    const user = await registerUser(app, {
      email: 'admin@test.com',
      password: 'password123',
    });

    const animalResponse = await request(app.getHttpServer())
      .post('/api/animals')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'Rex',
        speciesId: caoSpeciesId,
        breedId: caoBreedId,
        sex: 'MALE',
      })
      .expect(201);

    const vetResponse = await request(app.getHttpServer())
      .post('/api/veterinarians')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: 'Dr. Silva',
        crmv: `CRMV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      .expect(201);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const allergy = await prisma.allergy.create({
      data: { name: `Alergia ${suffix}` },
    });
    const medication = await prisma.medication.create({
      data: { name: `Medicamento ${suffix}` },
    });
    const vaccine = await prisma.vaccine.create({
      data: { name: `Vacina ${suffix}` },
    });

    return {
      user,
      animalId: animalResponse.body.animal.id as string,
      veterinarianId: vetResponse.body.id as string,
      allergyId: allergy.id,
      medicationId: medication.id,
      vaccineId: vaccine.id,
    };
  }

  type Clinic = Awaited<ReturnType<typeof setupClinic>>;

  function newRecordRequests(clinic: Clinic) {
    const { animalId, veterinarianId } = clinic;

    return [
      {
        resource: 'weight',
        method: 'post' as const,
        path: `/api/animals/${animalId}/weight`,
        body: { weight: 12.5 },
      },
      {
        resource: 'allergy',
        method: 'post' as const,
        path: `/api/animals/${animalId}/allergies`,
        body: { allergyId: clinic.allergyId },
      },
      {
        resource: 'medication',
        method: 'post' as const,
        path: `/api/animals/${animalId}/medications`,
        body: {
          medicationId: clinic.medicationId,
          dosage: '1 comprimido',
          frequency: '12h',
          startDate: '2025-06-01T10:00:00.000Z',
        },
      },
      {
        resource: 'vaccination',
        method: 'post' as const,
        path: `/api/animals/${animalId}/vaccinations`,
        body: {
          vaccineId: clinic.vaccineId,
          applicationDate: '2025-06-01T10:00:00.000Z',
        },
      },
      {
        resource: 'consultation',
        method: 'post' as const,
        path: '/api/consultations',
        body: {
          animalId,
          veterinarianId,
          startedAt: '2025-06-01T10:00:00.000Z',
        },
      },
      {
        resource: 'appointment',
        method: 'post' as const,
        path: '/api/appointments',
        body: {
          animalId,
          veterinarianId,
          scheduledAt: '2025-06-01T10:00:00.000Z',
        },
      },
    ];
  }

  function historyReadRequests(clinic: Clinic) {
    const { animalId } = clinic;

    return [
      `/api/animals/${animalId}/weight`,
      `/api/animals/${animalId}/allergies`,
      `/api/animals/${animalId}/medications`,
      `/api/animals/${animalId}/vaccinations`,
      '/api/consultations',
      '/api/appointments',
    ];
  }

  async function deactivateClinicLink(clinic: Clinic) {
    const response = await request(app.getHttpServer())
      .patch(`/api/animals/${clinic.animalId}/clinic/deactivate`)
      .set('Authorization', `Bearer ${clinic.user.accessToken}`)
      .expect(200);

    expect(response.body.status).toBe('INACTIVE');
  }

  it('should create clinical records while the clinic link is active', async () => {
    const clinic = await setupClinic();

    for (const record of newRecordRequests(clinic)) {
      await request(app.getHttpServer())
        [record.method](record.path)
        .set('Authorization', `Bearer ${clinic.user.accessToken}`)
        .send(record.body)
        .expect(201);
    }
  });

  it('should refuse new clinical records when the clinic link is inactive', async () => {
    const clinic = await setupClinic();

    await deactivateClinicLink(clinic);

    for (const record of newRecordRequests(clinic)) {
      const response = await request(app.getHttpServer())
        [record.method](record.path)
        .set('Authorization', `Bearer ${clinic.user.accessToken}`)
        .send(record.body);

      expect(
        response.status,
        `${record.resource} deveria ser recusado com 400`,
      ).toBe(400);
      expect(response.body.message).toContain('inactive');
    }
  });

  it('should keep the clinical history readable when the clinic link is inactive', async () => {
    const clinic = await setupClinic();

    for (const record of newRecordRequests(clinic)) {
      await request(app.getHttpServer())
        [record.method](record.path)
        .set('Authorization', `Bearer ${clinic.user.accessToken}`)
        .send(record.body)
        .expect(201);
    }

    await deactivateClinicLink(clinic);

    for (const path of historyReadRequests(clinic)) {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${clinic.user.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    }
  });
});
