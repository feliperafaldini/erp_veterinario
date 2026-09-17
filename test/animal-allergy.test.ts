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

describe('ANIMAL_ALLERGIES', () => {
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

  async function createAllergy(name: string) {
    const prisma = getPrisma(app);
    return prisma.allergy.create({
      data: { name },
    });
  }

  async function addAnimalAllergy(
    user: { accessToken: string; tenantId: string },
    animalId: string,
    allergyId: string,
    severity?: string,
  ) {
    const body: Record<string, unknown> = { allergyId };
    if (severity) body.severity = severity;

    const response = await request(app.getHttpServer())
      .post(`/api/animals/${animalId}/allergies`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(body)
      .expect(201);

    return response.body;
  }

  describe('POST /api/animals/:animalId/allergies', () => {
    it('should add an allergy to an animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy = await createAllergy('Pólen');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.allergy.id).toBe(allergy.id);
      expect(response.body.allergy.name).toBe('Pólen');
      expect(response.body.animal.id).toBe(animal.animal.id);
      expect(response.body.registeredByTenantId).toBe(user.tenantId);
      expect(response.body.registeredByUserId).toBe(user.userId);
      expect(response.body).toHaveProperty('registeredAt');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should add an allergy with severity', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy = await createAllergy('Pólen');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
          severity: 'grave',
        })
        .expect(201);

      expect(response.body.severity).toBe('grave');
    });

    it('should add an allergy with description and notes', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy = await createAllergy('Pólen');

      const response = await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
          description: 'Alergia a pólen de gramíneas',
          notes: 'Reação aparece na primavera',
        })
        .expect(201);

      expect(response.body.description).toBe('Alergia a pólen de gramíneas');
      expect(response.body.notes).toBe('Reação aparece na primavera');
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
      const allergy = await createAllergy('Pólen');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          allergyId: allergy.id,
        })
        .expect(404);
    });

    it('should return 404 for nonexistent animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const allergy = await createAllergy('Pólen');
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
        })
        .expect(404);
    });

    it('should return 404 for nonexistent allergy', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const fakeAllergyId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: fakeAllergyId,
        })
        .expect(404);
    });

    it('should return 400 for invalid animal UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const allergy = await createAllergy('Pólen');

      await request(app.getHttpServer())
        .post('/api/animals/invalid-uuid/allergies')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
        })
        .expect(400);
    });

    it('should return 400 for invalid allergy UUID', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: 'invalid-uuid',
        })
        .expect(400);
    });

    it('should return 400 for missing allergyId', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 409 for duplicate allergy', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy = await createAllergy('Pólen');

      await addAnimalAllergy(user, animal.animal.id, allergy.id);

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
        })
        .expect(409);
    });

    it('should return 400 when tenantId is sent in body', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy = await createAllergy('Pólen');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
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
      const allergy = await createAllergy('Pólen');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
          animalId: 'some-animal-id',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .post(`/api/animals/${fakeAnimalId}/allergies`)
        .send({
          allergyId: '00000000-0000-4000-8000-000000000000',
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
      const allergy = await createAllergy('Pólen');

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
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          allergyId: allergy.id,
        })
        .expect(403);
    });
  });

  describe('GET /api/animals/:animalId/allergies', () => {
    it('should list allergies for the animal', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy1 = await createAllergy('Pólen');
      const allergy2 = await createAllergy('Ácaro');

      await addAnimalAllergy(user, animal.animal.id, allergy1.id);
      await addAnimalAllergy(user, animal.animal.id, allergy2.id);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return allergies ordered by registeredAt desc', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy1 = await createAllergy('Pólen');
      const allergy2 = await createAllergy('Ácaro');
      const allergy3 = await createAllergy('Flea');

      await addAnimalAllergy(user, animal.animal.id, allergy1.id);
      await addAnimalAllergy(user, animal.animal.id, allergy2.id);
      await addAnimalAllergy(user, animal.animal.id, allergy3.id);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(3);
      expect(response.body[0].allergy.name).toBe('Flea');
      expect(response.body[1].allergy.name).toBe('Ácaro');
      expect(response.body[2].allergy.name).toBe('Pólen');
    });

    it('should return empty array for animal with no allergies', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/allergies`)
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
        .get(`/api/animals/${animal.animal.id}/allergies`)
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
        .get(`/api/animals/${fakeAnimalId}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const fakeAnimalId = '00000000-0000-4000-8000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/animals/${fakeAnimalId}/allergies`)
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
        .get(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Multi-tenancy', () => {
    it('should show global allergies to both tenants with access', async () => {
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

      const allergy = await createAllergy('Pólen');
      await addAnimalAllergy(userA, animal.animal.id, allergy.id);

      const responseA = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(200);

      expect(responseA.body.length).toBe(1);
      expect(responseB.body.length).toBe(1);
      expect(responseA.body[0].id).toBe(responseB.body[0].id);
    });

    it('should prevent Tenant B from adding allergy for Tenant A animal without association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const allergy = await createAllergy('Pólen');

      await request(app.getHttpServer())
        .post(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({
          allergyId: allergy.id,
        })
        .expect(404);
    });

    it('should prevent Tenant B from reading allergies for Tenant A animal without association', async () => {
      const userA = await registerUser(app, {
        email: 'adminA@test.com',
        password: 'password123',
      });

      const userB = await registerUser(app, {
        email: 'adminB@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(userA);
      const allergy = await createAllergy('Pólen');
      await addAnimalAllergy(userA, animal.animal.id, allergy.id);

      await request(app.getHttpServer())
        .get(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .expect(404);
    });

    it('should record tenantId as provenance of who registered the allergy', async () => {
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

      const allergy1 = await createAllergy('Pólen');
      const allergy2 = await createAllergy('Ácaro');

      await addAnimalAllergy(userA, animalA.animal.id, allergy1.id);
      await addAnimalAllergy(userB, animalA.animal.id, allergy2.id);

      const response = await request(app.getHttpServer())
        .get(`/api/animals/${animalA.animal.id}/allergies`)
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
    it('should return 404 for DELETE /api/animals/:animalId/allergies', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy = await createAllergy('Pólen');
      await addAnimalAllergy(user, animal.animal.id, allergy.id);

      await request(app.getHttpServer())
        .delete(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('No PATCH endpoint', () => {
    it('should return 404 for PATCH /api/animals/:animalId/allergies', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const animal = await createAnimal(user);
      const allergy = await createAllergy('Pólen');
      await addAnimalAllergy(user, animal.animal.id, allergy.id);

      await request(app.getHttpServer())
        .patch(`/api/animals/${animal.animal.id}/allergies`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ severity: 'leve' })
        .expect(404);
    });
  });
});
