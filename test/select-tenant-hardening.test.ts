import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
  registerUser,
} from './helpers';

/**
 * Testes de regressão do achado P0-1 da auditoria de segurança:
 * POST /api/auth/select-tenant não exige nenhuma credencial e confia no
 * `userId` informado pelo cliente, permitindo obter um access token de
 * qualquer usuário (tomada de conta de outro tenant).
 *
 * As asserções são deliberadamente independentes da solução escolhida
 * (token intermediário, sessão parcial ou reautenticação): em qualquer um
 * dos desenhos, uma requisição sem credencial válida não pode emitir tokens.
 */
describe('AUTH select-tenant hardening (P0 regression)', () => {
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

  it('should not issue tokens when no credential is presented', async () => {
    const victim = await registerUser(app, {
      email: 'victim@test.com',
      password: 'password123',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/select-tenant')
      .send({
        tenantId: victim.tenantId,
      });

    expect([400, 401, 403]).toContain(response.status);
    expect(response.body.accessToken).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('should not issue tokens for another user when authenticated', async () => {
    const attacker = await registerUser(app, {
      email: 'attacker@test.com',
      password: 'password123',
    });

    const victim = await registerUser(app, {
      email: 'victim2@test.com',
      password: 'password123',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/select-tenant')
      .set('Authorization', `Bearer ${attacker.selectionToken}`)
      .send({
        tenantId: victim.tenantId,
      });

    expect([400, 401, 403]).toContain(response.status);
    expect(response.body.accessToken).toBeUndefined();
  });

  it('should reject selection token used on a protected route', async () => {
    const user = await registerUser(app, {
      email: 'user@test.com',
      password: 'password123',
    });

    await request(app.getHttpServer())
      .get('/api/animals')
      .set('Authorization', `Bearer ${user.selectionToken}`)
      .expect(401);
  });

  it('should reject access token used on select-tenant', async () => {
    const user = await registerUser(app, {
      email: 'user@test.com',
      password: 'password123',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/select-tenant')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        tenantId: user.tenantId,
      });

    expect(response.status).toBe(401);
    expect(response.body.accessToken).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('should complete legitimate flow: login -> selectionToken -> accessToken', async () => {
    const registered = await registerUser(app, {
      email: 'user@test.com',
      password: 'password123',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'user@test.com',
        password: 'password123',
      })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('selectionToken');

    const selectResponse = await request(app.getHttpServer())
      .post('/api/auth/select-tenant')
      .set('Authorization', `Bearer ${loginResponse.body.selectionToken}`)
      .send({
        tenantId: registered.tenantId,
      })
      .expect(201);

    expect(selectResponse.body).toHaveProperty('accessToken');
    expect(selectResponse.headers['set-cookie']).toBeDefined();

    await request(app.getHttpServer())
      .get('/api/animals')
      .set('Authorization', `Bearer ${selectResponse.body.accessToken}`)
      .expect(200);
  });
});
