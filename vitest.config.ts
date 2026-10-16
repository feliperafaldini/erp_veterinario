import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['test/**/*.test.ts', 'src/**/*.spec.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      // A suíte dispara centenas de chamadas de autenticação em série, do
      // mesmo IP. O rate limiting dos endpoints de /auth é desligado na prática
      // no ambiente de teste; ele é exercitado em auth-throttling.test.ts, que
      // sobrescreve estes valores com um limite baixo.
      AUTH_THROTTLE_LIMIT: '100000',
      AUTH_THROTTLE_TTL_MS: '60000',
    },
  },
});
