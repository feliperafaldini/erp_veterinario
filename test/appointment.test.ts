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

describe('APPOINTMENTS', () => {
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
    overrides?: { tutorId?: string; scheduledAt?: string; reason?: string; notes?: string },
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

  describe('POST /api/appointments', () => {
    it('should create an appointment', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('SCHEDULED');
      expect(response.body.animal.id).toBe(animal.animal.id);
      expect(response.body.veterinarian.id).toBe(vet.id);
      expect(response.body.scheduledAt).toBe('2025-06-01T10:00:00.000Z');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create an appointment with optional fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);
      const tutor = await createTutor(user);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          tutorId: tutor.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
          reason: 'Vacinação anual',
          notes: 'Trazer caderneta de vacinação',
        })
        .expect(201);

      expect(response.body.tutor.id).toBe(tutor.id);
      expect(response.body.reason).toBe('Vacinação anual');
      expect(response.body.notes).toBe('Trazer caderneta de vacinação');
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
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
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
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: fakeAnimalId,
          veterinarianId: vet.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
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
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: fakeVetId,
          scheduledAt: '2025-06-01T10:00:00.000Z',
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
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
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
        .post('/api/appointments')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          tutorId: tutor.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 400 for invalid animal UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const vet = await createVeterinarian(user);

      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: 'invalid-uuid',
          veterinarianId: vet.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/appointments')
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
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
          tenantId: 'some-tenant-id',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          animalId: '00000000-0000-4000-8000-000000000000',
          veterinarianId: '00000000-0000-4000-8000-000000000000',
          scheduledAt: '2025-06-01T10:00:00.000Z',
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
        .post('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          animalId: animal.animal.id,
          veterinarianId: vet.id,
          scheduledAt: '2025-06-01T10:00:00.000Z',
        })
        .expect(403);
    });
  });

  describe('GET /api/appointments', () => {
    it('should list appointments for the tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      await createAppointment(user, animal.animal.id, vet.id);
      await createAppointment(user, animal.animal.id, vet.id, {
        scheduledAt: '2025-06-02T10:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return appointments ordered by scheduledAt desc', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vet = await createVeterinarian(user);

      await createAppointment(user, animal.animal.id, vet.id, {
        scheduledAt: '2025-06-01T10:00:00.000Z',
      });
      await createAppointment(user, animal.animal.id, vet.id, {
        scheduledAt: '2025-06-03T10:00:00.000Z',
      });
      await createAppointment(user, animal.animal.id, vet.id, {
        scheduledAt: '2025-06-02T10:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body[0].scheduledAt).toBe('2025-06-03T10:00:00.000Z');
      expect(response.body[1].scheduledAt).toBe('2025-06-02T10:00:00.000Z');
      expect(response.body[2].scheduledAt).toBe('2025-06-01T10:00:00.000Z');
    });

    it('should return empty array for tenant with no appointments', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/appointments')
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
        .get('/api/appointments')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/appointments/:id', () => {
    it('should return an appointment by id', async () => {
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
        .get(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(appointment.id);
    });

    it('should return 404 for nonexistent appointment', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 for appointment from another tenant', async () => {
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
        userA,
        animalA.animal.id,
        vetA.id,
      );

      await request(app.getHttpServer())
        .get(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/appointments/invalid-uuid')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/appointments/:id', () => {
    it('should update appointment status', async () => {
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
        .patch(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('should update multiple fields', async () => {
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
        .patch(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          status: 'COMPLETED',
          notes: 'Consulta realizada com sucesso',
        })
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.notes).toBe('Consulta realizada com sucesso');
    });

    it('should return 404 for appointment from another tenant', async () => {
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
        userA,
        animalA.animal.id,
        vetA.id,
      );

      await request(app.getHttpServer())
        .patch(`/api/appointments/${appointment.id}`)
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
      const appointment = await createAppointment(
        user,
        animal.animal.id,
        vet.id,
      );

      await request(app.getHttpServer())
        .patch(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  describe('DELETE /api/appointments/:id (not allowed)', () => {
    it('should return 404 for DELETE on collection', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete('/api/appointments')
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
      const appointment = await createAppointment(
        user,
        animal.animal.id,
        vet.id,
      );

      await request(app.getHttpServer())
        .delete(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('Multi-tenancy', () => {
    it('should isolate appointments between tenants', async () => {
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

      await createAppointment(userA, animalA.animal.id, vetA.id);
      await createAppointment(userB, animalB.animal.id, vetB.id);

      const responseA = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.length).toBe(1);
      expect(responseB.body.length).toBe(1);
    });
  });

  describe('Status transitions', () => {
    it('should allow SCHEDULED → IN_PROGRESS', async () => {
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

      expect(appointment.status).toBe('SCHEDULED');

      const response = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('should allow SCHEDULED → CANCELLED', async () => {
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
        .patch(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });

    it('should allow IN_PROGRESS → COMPLETED', async () => {
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

      await request(app.getHttpServer())
        .patch(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });
  });
});
