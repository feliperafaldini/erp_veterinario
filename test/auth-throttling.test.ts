// O rate limiting é configurado a partir do ambiente no momento em que a
// aplicação é compilada, por isso os valores precisam ser definidos antes de
// createTestApp() (a suíte inteira roda com o limite alto do vitest.config.ts).
process.env.AUTH_THROTTLE_LIMIT = '3';
process.env.AUTH_THROTTLE_TTL_MS = '60000';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
} from './helpers';

describe('AUTH THROTTLING', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await seedRolesAndPermissions(app);
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  function login() {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ninguem@test.com', password: 'password123' });
  }

  it('should accept requests up to the limit and block the next one', async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await login().expect(401);
    }

    const blocked = await login();

    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toContain('Too many requests');
  });
});
