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

  describe('POST /api/tutors — document normalization', () => {
    it('should store a masked CPF as digits only', async () => {
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
          documentNumber: '123.456.789-01',
        })
        .expect(201);

      expect(response.body.tutorIdentity.documentNumber).toBe('12345678901');
    });

    it('should accept a masked CNPJ that exceeds 14 raw characters', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      // '12.345.678/0001-90' tem 18 caracteres, acima do @MaxLength(14).
      // A normalização para 14 dígitos precisa ocorrer ANTES da validação.
      const response = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'Empresa Ltda',
          documentType: 'CNPJ',
          documentNumber: '12.345.678/0001-90',
        })
        .expect(201);

      expect(response.body.tutorIdentity.documentNumber).toBe('12345678000190');
    });

    it('should not create a second TutorIdentity when the CPF is sent with a mask', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const masked = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '123.456.789-01',
        })
        .expect(201);

      // No mesmo tenant a segunda grafia é uma duplicata legítima: normaliza
      // para o mesmo documento e o service a rejeita com 409.
      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(409);

      // Regra de identidade global: as duas grafias são o MESMO documento,
      // então existe uma única TutorIdentity — não duas fragmentadas.
      const prisma = getPrisma(app);
      const identities = await prisma.tutorIdentity.findMany({
        where: { documentNumber: '12345678901' },
      });
      expect(identities).toHaveLength(1);
      expect(identities[0].id).toBe(masked.body.tutorIdentity.id);

      const tutors = await prisma.tutor.findMany({
        where: { tenantId: user.tenantId },
      });
      expect(tutors).toHaveLength(1);
    });

    it('should share one TutorIdentity across tenants for masked and unmasked CPF', async () => {
      const clinic1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });
      const clinic2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const masked = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${clinic1.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '123.456.789-01',
        })
        .expect(201);

      const unmasked = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${clinic2.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      expect(masked.body.tutorIdentity.id).toBe(unmasked.body.tutorIdentity.id);
      expect(masked.body.tenantId).not.toBe(unmasked.body.tenantId);
    });

    it('should return 409 when masked CPF duplicates an unmasked one in the same tenant', async () => {
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
          documentNumber: '123.456.789-01',
        })
        .expect(409);
    });

    it('should return 400 when the document normalizes to an empty string', async () => {
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
          documentNumber: '...',
        })
        .expect(400);
    });

    it('should return 400 when the normalized value still exceeds 14 digits', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      // 18 dígitos separados por pontos: normaliza para 18 dígitos.
      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8',
        })
        .expect(400);
    });

    it('should return 400 when documentNumber is a JSON number, not a string', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      // Trava contra regressão: a normalização NÃO pode coagir número em
      // string, senão este payload deixaria de ser rejeitado.
      await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: 12345678901,
        })
        .expect(400);
    });

    it('should reject the same digits registered under a different document type', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      // Mesmos dígitos gravados como CPF: cria a identidade.
      const asCpf = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CPF',
          documentNumber: '12345678901',
        })
        .expect(201);

      // Mesmos dígitos como CNPJ: o par (tipo, número) difere e seria aceito
      // pela constraint composta, mas a unicidade GLOBAL sobre documentNumber
      // isolado recusa — a identidade não se fragmenta por tipo.
      const asCnpj = await request(app.getHttpServer())
        .post('/api/tutors')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          name: 'João Silva',
          documentType: 'CNPJ',
          documentNumber: '12345678901',
        });

      expect(asCnpj.status).toBe(409);

      const prisma = getPrisma(app);
      const identities = await prisma.tutorIdentity.findMany({
        where: { documentNumber: '12345678901' },
      });
      expect(identities).toHaveLength(1);
      expect(identities[0].id).toBe(asCpf.body.tutorIdentity.id);
    });

    it('should return 409 instead of 500 on concurrent creates with the same document', async () => {
      const user = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      const payload = {
        name: 'João Silva',
        documentType: 'CPF',
        documentNumber: '987.654.321-00',
      };

      // Dispara as duas requisições sem aguardar a primeira: se ambas
      // passarem pelo findUnique antes de qualquer create, o banco é quem
      // decide — e a resposta precisa ser 409, nunca 500.
      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/tutors')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send(payload),
        request(app.getHttpServer())
          .post('/api/tutors')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send(payload),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 409]);
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
