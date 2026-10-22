const test = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { slugify } = require('../dist/common/slug.js');
const { validateEnvironment } = require('../dist/config/environment.js');
const { CsrfGuard } = require('../dist/auth/csrf.guard.js');

test('slugify Uzbek apostrophes and spaces consistently', () => {
  assert.equal(slugify('G‘oya bosqichi'), 'goya-bosqichi');
  assert.equal(slugify('O‘sish & Traction'), 'osish-traction');
});

test('environment validation rejects weak secrets', () => {
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_ACCESS_SECRET: 'short',
        JWT_REFRESH_SECRET: 'another-short',
      }),
    /kamida 32/,
  );
});

test('environment validation accepts independent strong secrets', () => {
  const config = {
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_ACCESS_SECRET: 'access-secret-that-is-longer-than-32-characters',
    JWT_REFRESH_SECRET: 'refresh-secret-that-is-longer-than-32-characters',
  };
  assert.equal(validateEnvironment(config), config);
});

test('environment validation rejects equal access and refresh secrets', () => {
  const sharedSecret = 'one-shared-secret-that-is-longer-than-32-characters';
  assert.throws(
    () => validateEnvironment({
      DATABASE_URL: 'postgresql://localhost/test',
      JWT_ACCESS_SECRET: sharedSecret,
      JWT_REFRESH_SECRET: sharedSecret,
    }),
    /har xil/,
  );
});

test('production rejects the default administrator password', () => {
  assert.throws(
    () => validateEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost/test',
      JWT_ACCESS_SECRET: 'access-secret-that-is-longer-than-32-characters',
      JWT_REFRESH_SECRET: 'refresh-secret-that-is-longer-than-32-characters',
      SEED_ADMIN_PASSWORD: 'ChangeMe123!',
    }),
    /standart admin paroli/,
  );
});

test('refresh session lifetime stays inside the allowed range', () => {
  assert.throws(
    () => validateEnvironment({
      DATABASE_URL: 'postgresql://localhost/test',
      JWT_ACCESS_SECRET: 'access-secret-that-is-longer-than-32-characters',
      JWT_REFRESH_SECRET: 'refresh-secret-that-is-longer-than-32-characters',
      REFRESH_TOKEN_TTL_DAYS: '365',
    }),
    /1 dan 90 gacha/,
  );
});

test('CSRF guard rejects foreign origins and accepts matching trusted tokens', () => {
  const guard = new CsrfGuard(new ConfigService({
    NODE_ENV: 'production',
    WEB_ORIGIN: 'https://app.example',
  }));
  const context = (request) => ({
    switchToHttp: () => ({ getRequest: () => request }),
  });

  assert.throws(
    () => guard.canActivate(context({
      method: 'POST',
      headers: { origin: 'https://evil.example', 'x-csrf-token': 'token' },
      cookies: { csrf_token: 'token' },
    })),
    /ruxsat/,
  );
  assert.equal(
    guard.canActivate(context({
      method: 'POST',
      headers: { origin: 'https://app.example', 'x-csrf-token': 'same-token' },
      cookies: { csrf_token: 'same-token' },
    })),
    true,
  );
});
