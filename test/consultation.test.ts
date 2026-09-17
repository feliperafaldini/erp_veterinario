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

describe('CONSULTATIONS', () => {
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

  async function createTutor(
    user: { accessToken: string; tenantId: string },
    email = 'tutor@test.com',
  ) {
    const prisma = getPrisma(app);
    const tutorIdentity = await prisma.tutorIdentity.create({
      data: {
        name: 'Tutor Test',
        documentType: 'CPF',
        documentNumber: `${Date.now()}${Math.random().toString().slice(2, 5)}`.slice(0, 11),
      },
    });

    return prisma.tutor.create({
      data: {
        tenantId: user.tenantId,
        tutorIdentityId: tutorIdentity.id,
        email,
      },
    });
  }

  async function createAppointment(
    user: { accessToken: string; tenantId: string },
    animalId: string,
    veterinarianId: string,
    overrides?: { tutorId?: string; scheduledAt?: string; reason?: string },
  ) {
    const body: Record<string, unknown> = {
      animalId,
      veterinarianId,
      scheduledAt: '2025-06-01T10:00:00.000Z',
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(body)
      .expect(201);

    return response.body;
  }

  async function createConsultation(
    user: { accessToken: string; tenantId: string },
    animalId: string,
    veterinarianId: string,
    overrides?: {
      appointmentId?: string;
      tutorId?: string;
      startedAt?: string;
      chiefComplaint?: string;
    },
  ) {
    const body: Record<string, unknown> = {
      animalId,
      veterinarianId,
      startedAt: '2025-06-01T10:00:00.000Z',
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post('/api/consultations')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(body)
      .expect(201);

    return response.body;
  }

  describe('POST /api/consultations', () => {
    it('should create a consultation with appointment', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const appointment = await createAppointment(
        user,
        animal.animal.id,
        vet.id,
      );

      const response = await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          appointmentId: appointment.id,
          startedAt: '2025-06-01T10:00:00.000Z',
          chiefComplaint: 'Vômito há 2 dias',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('OPEN');
      expect(response.body.animal.id).toBe(animal.animal.id);
      expect(response.body.veterinarian.id).toBe(vet.id);
      expect(response.body.appointment.id).toBe(appointment.id);
      expect(response.body.chiefComplaint).toBe('Vômito há 2 dias');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create a consultation without appointment', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      const response = await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('OPEN');
      expect(response.body.appointment).toBeNull();
    });

    it('should create a consultation with tutor', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const tutor = await createTutor(user);

      const response = await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          tutorId: tutor.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(201);

      expect(response.body.tutor.id).toBe(tutor.id);
    });

    it('should create a consultation without tutor', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      const response = await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(201);

      expect(response.body.tutor).toBeNull();
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
      const vet = await createVeterinarian(userB);

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const vet = await createVeterinarian(user);
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: fakeAnimalId,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for nonexistent veterinarian', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const fakeVetId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: fakeVetId,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for veterinarian not associated with clinic', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const vet = await createVeterinarian(userB);

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for tutor not associated with clinic', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const vet = await createVeterinarian(userA);
      const tutor = await createTutor(userB);

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          tutorId: tutor.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for appointment not associated with clinic', async () => {
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
      const appointment = await createAppointment(
        userB,
        await createAnimal(userB).then((a) => a.animal.id),
        await createVeterinarian(userB).then((v) => v.id),
      );

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          animalId: animalA.animal.id,
          veterinarianId: vetA.id,
          appointmentId: appointment.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 400 for appointment with different animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animalA = await createAnimal(user);
      const animalB = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const appointment = await createAppointment(
        user,
        animalA.animal.id,
        vet.id,
      );

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animalB.animal.id,
          veterinarianId: vet.id,
          appointmentId: appointment.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/consultations')
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
      const vet = await createVeterinarian(user);

      await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
          tenantId: 'some-tenant-id',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/consultations')
        .send({
          animalId: '00000000-0000-4000-8000-000000000000',
          veterinarianId: '00000000-0000-4000-8000-000000000000',
          startedAt: '2025-06-01T10:00:00.000Z',
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
        .post('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          startedAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(403);
    });
  });

  describe('GET /api/consultations', () => {
    it('should list consultations for the tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      await createConsultation(user, animal.animal.id, vet.id);
      await createConsultation(user, animal.animal.id, vet.id, {
        startedAt: '2025-06-02T10:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return consultations ordered by startedAt desc', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      await createConsultation(user, animal.animal.id, vet.id, {
        startedAt: '2025-06-01T10:00:00.000Z',
      });
      await createConsultation(user, animal.animal.id, vet.id, {
        startedAt: '2025-06-03T10:00:00.000Z',
      });
      await createConsultation(user, animal.animal.id, vet.id, {
        startedAt: '2025-06-02T10:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body[0].startedAt).toBe('2025-06-03T10:00:00.000Z');
      expect(response.body[1].startedAt).toBe('2025-06-02T10:00:00.000Z');
      expect(response.body[2].startedAt).toBe('2025-06-01T10:00:00.000Z');
    });

    it('should return empty array for tenant with no consultations', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/consultations')
        .expect(401);
    });

    it('should return 403 without ANIMAL_READ permission', async () => {
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
        .get('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/consultations/:id', () => {
    it('should return a consultation by id', async () => {
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
        .get(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(consultation.id);
    });

    it('should return 404 for nonexistent consultation', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/consultations/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
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
        .get(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/consultations/invalid-uuid')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/consultations/:id', () => {
    it('should update consultation chief complaint', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ chiefComplaint: 'Diarreia' })
        .expect(200);

      expect(response.body.chiefComplaint).toBe('Diarreia');
    });

    it('should complete a consultation', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.finishedAt).not.toBeNull();
    });

    it('should cancel a consultation', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });

    it('should return 400 when trying to edit completed consultation', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ chiefComplaint: 'Updated' })
        .expect(400);
    });

    it('should return 400 when trying to edit cancelled consultation', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ chiefComplaint: 'Updated' })
        .expect(400);
    });

    it('should return 400 when trying to reopen completed consultation', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'OPEN' })
        .expect(400);
    });

    it('should return 400 when trying to complete cancelled consultation', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(400);
    });

    it('should return 400 when trying to cancel completed consultation', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'CANCELLED' })
        .expect(400);
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(404);
    });

    it('should return 400 for invalid status', async () => {
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
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  describe('DELETE /api/consultations/:id (not allowed)', () => {
    it('should return 404 for DELETE on collection', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete('/api/consultations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 for DELETE on resource', async () => {
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
        .delete(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('Multi-tenancy', () => {
    it('should isolate consultations between tenants', async () => {
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

      await createConsultation(userA, animalA.animal.id, vetA.id);
      await createConsultation(userB, animalB.animal.id, vetB.id);

      const responseA = await request(app.getHttpServer())
        .get('/api/consultations')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get('/api/consultations')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.length).toBe(1);
      expect(responseB.body.length).toBe(1);
    });
  });

  describe('History preservation', () => {
    it('should preserve consultation after completion', async () => {
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
        { chiefComplaint: 'Dor' },
      );

      await request(app.getHttpServer())
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.chiefComplaint).toBe('Dor');
    });

    it('should preserve consultation after cancellation', async () => {
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
        { chiefComplaint: 'Tosse' },
      );

      await request(app.getHttpServer())
        .patch(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/consultations/${consultation.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
      expect(response.body.chiefComplaint).toBe('Tosse');
    });
  });
});
