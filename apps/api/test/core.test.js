const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify } = require('../dist/common/slug.js');
const { validateEnvironment } = require('../dist/config/environment.js');

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
