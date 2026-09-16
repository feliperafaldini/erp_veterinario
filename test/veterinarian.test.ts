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

describe('VETERINARIANS', () => {
  let app: INestApplication;

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
  });

  describe('POST /api/veterinarians', () => {
    it('should create a veterinarian profile and link to tenant', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
          bio: 'Especialista em clínica geral',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.veterinarian.name).toBe('Dr. João Silva');
      expect(response.body.veterinarian.crmv).toBe('CRMV-SP 12345');
      expect(response.body.veterinarian.bio).toBe('Especialista em clínica geral');
      expect(response.body.isActive).toBe(true);
    });

    it('should create with specialties', async () => {
      const prisma = getPrisma(app);

      const specialty = await prisma.specialty.upsert({
        where: { name: 'Cardiologia' },
        update: {},
        create: { name: 'Cardiologia' },
      });

      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
          specialtyIds: [specialty.id],
        })
        .expect(201);

      expect(response.body.veterinarian.veterinarianSpecialties).toHaveLength(1);
      expect(response.body.veterinarian.veterinarianSpecialties[0].specialty.name).toBe('Cardiologia');
    });

    it('should return 409 if user already has veterinarian profile', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 99999',
        })
        .expect(409);
    });

    it('should return 409 if CRMV already exists', async () => {
      const user1 = await registerUser(app, {
        email: 'vet1@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const user2 = await registerUser(app, {
        email: 'vet2@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({
          name: 'Dr. Maria Santos',
          crmv: 'CRMV-SP 12345',
        })
        .expect(409);
    });

    it('should return 409 if already linked to same tenant', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const user2 = await registerUser(app, {
        email: 'vet2@test.com',
        password: 'password123',
      });

      const prisma = getPrisma(app);
      const veterinarian = await prisma.veterinarian.findFirst({
        where: { userId: user.userId },
      });

      await prisma.tenantVeterinarian.create({
        data: {
          tenantId: user2.tenantId,
          veterinarianId: veterinarian!.id,
        },
      });

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(409);
    });

    it('should return 400 for invalid data', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: '',
          crmv: '',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(401);
    });
  });

  describe('GET /api/veterinarians', () => {
    it('should list veterinarians for authenticated tenant', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].veterinarian.name).toBe('Dr. João Silva');
    });

    it('should only return active associations', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/veterinarians/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/veterinarians').expect(401);
    });
  });

  describe('GET /api/veterinarians/:id', () => {
    it('should return veterinarian by id', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/veterinarians/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createResponse.body.id);
      expect(response.body.veterinarian.name).toBe('Dr. João Silva');
    });

    it('should return 404 for nonexistent id', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/veterinarians/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid uuid', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/veterinarians/invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });

    it('should not return veterinarian from another tenant', async () => {
      const user1 = await registerUser(app, {
        email: 'vet1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'vet2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/veterinarians/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/veterinarians/:id', () => {
    it('should update veterinarian profile', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/veterinarians/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva Santos',
          bio: 'Atualizado',
          room: 'Sala 101',
          function: 'Clínico Geral',
        })
        .expect(200);

      expect(response.body.veterinarian.name).toBe('Dr. João Silva Santos');
      expect(response.body.veterinarian.bio).toBe('Atualizado');
      expect(response.body.room).toBe('Sala 101');
      expect(response.body.function).toBe('Clínico Geral');
    });

    it('should return 404 for nonexistent veterinarian', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/api/veterinarians/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should not update veterinarian from another tenant', async () => {
      const user1 = await registerUser(app, {
        email: 'vet1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'vet2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/veterinarians/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });
  });

  describe('PATCH /api/veterinarians/:id/deactivate', () => {
    it('should deactivate veterinarian association', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/veterinarians/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should return 400 if already deactivated', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/veterinarians/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/veterinarians/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });

    it('should return 404 for nonexistent veterinarian', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/api/veterinarians/${fakeId}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/veterinarians/:id/specialties', () => {
    it('should associate specialties', async () => {
      const prisma = getPrisma(app);

      const specialty1 = await prisma.specialty.upsert({
        where: { name: 'Cardiologia' },
        update: {},
        create: { name: 'Cardiologia' },
      });

      const specialty2 = await prisma.specialty.upsert({
        where: { name: 'Dermatologia' },
        update: {},
        create: { name: 'Dermatologia' },
      });

      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .put(`/api/veterinarians/${createResponse.body.id}/specialties`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          specialtyIds: [specialty1.id, specialty2.id],
        })
        .expect(200);

      expect(response.body.veterinarian.veterinarianSpecialties).toHaveLength(2);
      const names = response.body.veterinarian.veterinarianSpecialties.map((s: any) => s.specialty.name);
      expect(names).toContain('Cardiologia');
      expect(names).toContain('Dermatologia');
    });

    it('should replace existing specialties', async () => {
      const prisma = getPrisma(app);

      const specialty1 = await prisma.specialty.upsert({
        where: { name: 'Cardiologia' },
        update: {},
        create: { name: 'Cardiologia' },
      });

      const specialty2 = await prisma.specialty.upsert({
        where: { name: 'Dermatologia' },
        update: {},
        create: { name: 'Dermatologia' },
      });

      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
          specialtyIds: [specialty1.id],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .put(`/api/veterinarians/${createResponse.body.id}/specialties`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          specialtyIds: [specialty2.id],
        })
        .expect(200);

      expect(response.body.veterinarian.veterinarianSpecialties).toHaveLength(1);
      expect(response.body.veterinarian.veterinarianSpecialties[0].specialty.name).toBe('Dermatologia');
    });

    it('should return 404 for nonexistent specialty', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const fakeSpecialtyId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

      await request(app.getHttpServer())
        .put(`/api/veterinarians/${createResponse.body.id}/specialties`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          specialtyIds: [fakeSpecialtyId],
        })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put('/api/veterinarians/00000000-0000-0000-0000-000000000000/specialties')
        .send({ specialtyIds: [] })
        .expect(401);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant access for GET', async () => {
      const user1 = await registerUser(app, {
        email: 'vet1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'vet2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/veterinarians/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(404);
    });

    it('should prevent cross-tenant access for PATCH', async () => {
      const user1 = await registerUser(app, {
        email: 'vet1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'vet2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/veterinarians/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('should prevent cross-tenant access for deactivate', async () => {
      const user1 = await registerUser(app, {
        email: 'vet1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'vet2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/veterinarians/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(404);
    });

    it('should allow same veterinarian in different tenants', async () => {
      const user1 = await registerUser(app, {
        email: 'vet1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'vet2@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      const prisma = getPrisma(app);
      const veterinarian = await prisma.veterinarian.findFirst({
        where: { crmv: 'CRMV-SP 12345' },
      });

      await prisma.tenantVeterinarian.create({
        data: {
          tenantId: user2.tenantId,
          veterinarianId: veterinarian!.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/veterinarians')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(1);
    });
  });

  describe('Authentication', () => {
    it('should return 401 for POST without token', async () => {
      await request(app.getHttpServer())
        .post('/api/veterinarians')
        .send({ name: 'Test', crmv: '123' })
        .expect(401);
    });

    it('should return 401 for GET without token', async () => {
      await request(app.getHttpServer())
        .get('/api/veterinarians')
        .expect(401);
    });

    it('should return 401 for PATCH without token', async () => {
      await request(app.getHttpServer())
        .patch('/api/veterinarians/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/veterinarians')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('Tenant guard', () => {
    it('should return 403 for suspended user', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      await prisma.userTenant.updateMany({
        where: {
          userId: user.userId,
          tenantId: user.tenantId,
        },
        data: { status: 'SUSPENDED' },
      });

      await request(app.getHttpServer())
        .get('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it('should return 403 for revoked user', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      await prisma.userTenant.updateMany({
        where: {
          userId: user.userId,
          tenantId: user.tenantId,
        },
        data: { status: 'REVOKED' },
      });

      await request(app.getHttpServer())
        .get('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Permissions', () => {
    it('should return 403 for VETERINARIAN_CREATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'vet@test.com',
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
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(403);
    });

    it('should return 403 for VETERINARIAN_READ without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'vet@test.com',
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
        .get('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it('should return 403 for VETERINARIAN_UPDATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

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
        .patch(`/api/veterinarians/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(403);
    });

    it('should return 403 for VETERINARIAN_DEACTIVATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

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
        .patch(`/api/veterinarians/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('No DELETE endpoint', () => {
    it('should return 404 for DELETE /api/veterinarians/:id', async () => {
      const user = await registerUser(app, {
        email: 'vet@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/veterinarians')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Dr. João Silva',
          crmv: 'CRMV-SP 12345',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/veterinarians/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });
});
