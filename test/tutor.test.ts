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

describe('TUTORS', () => {
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

  describe('POST /api/tutors', () => {
    it('should create a tutor with CPF', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
          email: 'joao@test.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tenantId).toBe(user.tenantId);
      expect(response.body.email).toBe('joao@test.com');
      expect(response.body.isActive).toBe(true);
      expect(response.body.tutorIdentity.name).toBe('João Silva');
      expect(response.body.tutorIdentity.documentType).toBe('CPF');
      expect(response.body.tutorIdentity.documentNumber).toBe('12345678901');
    });

    it('should create a tutor with CNPJ', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Pet Shop LTDA',
          documentType: 'CNPJ',
          documentNumber: '12345678000190',
        })
        .expect(201);

      expect(response.body.tutorIdentity.documentType).toBe('CNPJ');
      expect(response.body.tutorIdentity.documentNumber).toBe('12345678000190');
    });

    it('should reuse existing TutorIdentity', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const response1 = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const response2 = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      expect(response1.body.tutorIdentity.id).toBe(
        response2.body.tutorIdentity.id,
      );
    });

    it('should return 409 when TutorIdentity exists with different name', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Santos',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(409);
    });

    it('should return 409 when tutor already exists in same tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(409);
    });

    it('should return 409 when email already exists in same tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
          email: 'joao@test.com',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Maria Silva',
          documentType: 'CPF',
          documentNumber: '12345678902',
          email: 'joao@test.com',
        })
        .expect(409);
    });

    it('should return 400 for invalid data', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: '',
          documentType: 'INVALID',
          documentNumber: '',
        })
        .expect(400);
    });

    it('should return 400 for invalid documentType', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'RG',
          documentNumber: '123456789',
        })
        .expect(400);
    });
  });

  describe('GET /api/tutors', () => {
    it('should list tutors for authenticated tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Maria Santos',
          documentType: 'CPF',
          documentNumber: '12345678902',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should only return active tutors', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should not return tutors from other tenants', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/tutors')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/tutors/:id', () => {
    it('should return tutor by id', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/tutors/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createResponse.body.id);
      expect(response.body.tutorIdentity.name).toBe('João Silva');
    });

    it('should return 404 for nonexistent id', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/tutors/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid uuid format', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/tutors/invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });

    it('should return 404 for tutor from another tenant', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/tutors/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/tutors/:id', () => {
    it('should update tutor', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
          email: 'joao@test.com',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          email: 'joao.updated@test.com',
          notes: 'Updated notes',
        })
        .expect(200);

      expect(response.body.email).toBe('joao.updated@test.com');
      expect(response.body.notes).toBe('Updated notes');
    });

    it('should return 404 for nonexistent tutor', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/api/tutors/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ email: 'test@test.com' })
        .expect(404);
    });

    it('should return 409 when updating to existing email in same tenant', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
          email: 'joao@test.com',
        })
        .expect(201);

      const tutor2 = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Maria Santos',
          documentType: 'CPF',
          documentNumber: '12345678902',
          email: 'maria@test.com',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/tutors/${tutor2.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ email: 'joao@test.com' })
        .expect(409);
    });

    it('should not update tutor from another tenant', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({ email: 'hacked@test.com' })
        .expect(404);
    });
  });

  describe('PATCH /api/tutors/:id/deactivate', () => {
    it('should deactivate tutor', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should return 400 when tutor is already deactivated', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });

    it('should return 404 for nonexistent tutor', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/api/tutors/${fakeId}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should not deactivate tutor from another tenant', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(404);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without access token', async () => {
      await request(app.getHttpServer()).get('/api/tutors').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/tutors')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('Tenant guard', () => {
    it('should return 403 for suspended user', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
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
        .get('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it('should return 403 for revoked user', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
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
        .get('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Permissions', () => {
    it('should return 403 for TUTOR_CREATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
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
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(403);
    });

    it('should return 403 for TUTOR_READ without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
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
        .get('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it('should return 403 for TUTOR_UPDATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
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
        .patch(`/api/tutors/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ email: 'updated@test.com' })
        .expect(403);
    });

    it('should return 403 for TUTOR_DEACTIVATE without permission', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
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
        .patch(`/api/tutors/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Tenant isolation', () => {
    it('should prevent cross-tenant access for GET', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/tutors/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(404);
    });

    it('should prevent cross-tenant access for PATCH', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({ email: 'hacked@test.com' })
        .expect(404);
    });

    it('should prevent cross-tenant access for deactivate', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/tutors/${createResponse.body.id}/deactivate`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(404);
    });

    it('should allow same tutor document in different tenants', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);
    });
  });

  describe('No mutation endpoints beyond defined', () => {
    it('should return 404 for DELETE /api/tutors/:id', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const createResponse = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/tutors/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });
});
