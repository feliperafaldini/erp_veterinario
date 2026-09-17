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

describe('ANIMAL_VACCINATIONS', () => {
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

  async function createVaccine(name: string) {
    const prisma = getPrisma(app);
    return prisma.vaccine.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  async function addAnimalVaccination(
    user: { accessToken: string; tenantId: string },
    animalId: string,
    vaccineId: string,
    overrides?: { applicationDate?: string; lotNumber?: string; nextDoseDate?: string; notes?: string },
  ) {
    const body: Record<string, unknown> = {
      vaccineId,
      applicationDate: '2025-01-15T00:00:00.000Z',
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post(`/api/animals/${animalId}/vaccinations`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(body)
      .expect(201);

    return response.body;
  }

  describe('POST /api/animals/:animalId/vaccinations', () => {
    it('should register a vaccination for an animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vaccine = await createVaccine('Vacina antirrábica');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.vaccine.id).toBe(vaccine.id);
      expect(response.body.vaccine.name).toBe('Vacina antirrábica');
      expect(response.body.animal.id).toBe(animal.animal.id);
      expect(response.body.applicationDate).toBe('2025-01-15T00:00:00.000Z');
      expect(response.body.lotNumber).toBeNull();
      expect(response.body.nextDoseDate).toBeNull();
      expect(response.body.notes).toBeNull();
      expect(response.body.registeredByTenantId).toBe(user.tenantId);
      expect(response.body.registeredByUserId).toBe(user.userId);
      expect(response.body).toHaveProperty('registeredAt');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should register a vaccination with optional fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vaccine = await createVaccine('Vacina antirrábica');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
          lotNumber: 'LOT-2025-001',
          nextDoseDate: '2026-01-15T00:00:00.000Z',
          notes: 'Vacinação de rotina anual',
        })
        .expect(201);

      expect(response.body.lotNumber).toBe('LOT-2025-001');
      expect(response.body.nextDoseDate).toBe('2026-01-15T00:00:00.000Z');
      expect(response.body.notes).toBe('Vacinação de rotina anual');
    });

    it('should allow same vaccine on different dates (historical)', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vaccine = await createVaccine('Vacina antirrábica');

      await addAnimalVaccination(user, animal.animal.id, vaccine.id, {
        applicationDate: '2025-01-15T00:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2026-01-15T00:00:00.000Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should return 409 for duplicate vaccine on same date', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vaccine = await createVaccine('Vacina antirrábica');

      await addAnimalVaccination(user, animal.animal.id, vaccine.id, {
        applicationDate: '2025-01-15T00:00:00.000Z',
      });

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(409);
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
      const vaccine = await createVaccine('Vacina antirrábica');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const vaccine = await createVaccine('Vacina antirrábica');
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 404 for nonexistent vaccine', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const fakeVaccineId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: fakeVaccineId,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(404);
    });

    it('should return 400 for invalid animal UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const vaccine = await createVaccine('Vacina antirrábica');

      await request(app.getHttpServer())
        .post('/api/animals/invalid-uuid/vaccinations')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should return 400 for invalid vaccine UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: 'invalid-uuid',
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vaccine = await createVaccine('Vacina antirrábica');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
        })
        .expect(400);
    });

    it('should return 400 when tenantId is sent in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vaccine = await createVaccine('Vacina antirrábica');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
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
      const vaccine = await createVaccine('Vacina antirrábica');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
          animalId: 'some-animal-id',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/vaccinations`)
        .send({
          vaccineId: '00000000-0000-4000-8000-000000000000',
          applicationDate: '2025-01-15T00:00:00.000Z',
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
      const vaccine = await createVaccine('Vacina antirrábica');

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
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(403);
    });
  });

  describe('GET /api/animals/:animalId/vaccinations', () => {
    it('should list vaccinations for the animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vac1 = await createVaccine('Vacina antirrábica');
      const vac2 = await createVaccine('Vacina tríplice felina');

      await addAnimalVaccination(user, animal.animal.id, vac1.id);
      await addAnimalVaccination(user, animal.animal.id, vac2.id);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return vaccinations ordered by applicationDate desc', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vac1 = await createVaccine('Vacina antirrábica');
      const vac2 = await createVaccine('Vacina tríplice felina');
      const vac3 = await createVaccine('Vacina Dengue');

      await addAnimalVaccination(user, animal.animal.id, vac1.id, {
        applicationDate: '2025-01-15T00:00:00.000Z',
      });
      await addAnimalVaccination(user, animal.animal.id, vac2.id, {
        applicationDate: '2025-06-01T00:00:00.000Z',
      });
      await addAnimalVaccination(user, animal.animal.id, vac3.id, {
        applicationDate: '2025-03-10T00:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body[0].vaccine.name).toBe('Vacina tríplice felina');
      expect(response.body[1].vaccine.name).toBe('Vacina Dengue');
      expect(response.body[2].vaccine.name).toBe('Vacina antirrábica');
    });

    it('should return empty array for animal with no vaccinations', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
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
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
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
        .get(`/api/animals/${fakeAnimalId}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/animals/${fakeAnimalId}/vaccinations`)
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
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Multi-tenancy', () => {
    it('should show global vaccinations to both tenants with access', async () => {
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

      const vaccine = await createVaccine('Vacina antirrábica');
      await addAnimalVaccination(userA, animal.animal.id, vaccine.id);

      const responseA = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.length).toBe(1);
      expect(responseB.body.length).toBe(1);
      expect(responseA.body[0].id).toBe(responseB.body[0].id);
    });

    it('should prevent Tenant B from adding vaccination for Tenant A animal without association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const vaccine = await createVaccine('Vacina antirrábica');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          vaccineId: vaccine.id,
          applicationDate: '2025-01-15T00:00:00.000Z',
        })
        .expect(404);
    });

    it('should prevent Tenant B from reading vaccinations for Tenant A animal without association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const vaccine = await createVaccine('Vacina antirrábica');
      await addAnimalVaccination(userA, animal.animal.id, vaccine.id);

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should record tenantId as provenance of who registered the vaccination', async () => {
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

      const vac1 = await createVaccine('Vacina antirrábica');
      const vac2 = await createVaccine('Vacina tríplice felina');

      await addAnimalVaccination(userA, animalA.animal.id, vac1.id, {
        applicationDate: '2025-01-15T00:00:00.000Z',
      });
      await addAnimalVaccination(userB, animalA.animal.id, vac2.id, {
        applicationDate: '2025-01-15T00:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animalA.animal.id}/vaccinations`)
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
    it('should return 404 for DELETE /api/animals/:animalId/vaccinations', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vaccine = await createVaccine('Vacina antirrábica');
      await addAnimalVaccination(user, animal.animal.id, vaccine.id);

      await request(app.getHttpServer())
        .delete(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('No PATCH endpoint', () => {
    it('should return 404 for PATCH /api/animals/:animalId/vaccinations', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const vaccine = await createVaccine('Vacina antirrábica');
      await addAnimalVaccination(user, animal.animal.id, vaccine.id);

      await request(app.getHttpServer())
        .patch(`/api/animals/${animal.animal.id}/vaccinations`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ notes: 'Updated notes' })
        .expect(404);
    });
  });
});
