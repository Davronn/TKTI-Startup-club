const test = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException } = require('@nestjs/common');
const { LoginAttemptLimiter } = require('../dist/auth/login-attempts.js');
const { rejectNulls } = require('../dist/common/reject-nulls.js');

test('login limiter blocks an account after repeated failures, regardless of IP', () => {
  const limiter = new LoginAttemptLimiter(3, 60_000);
  const now = 1_000_000;
  for (let i = 0; i < 3; i += 1) {
    assert.equal(limiter.retryAfterSeconds('a@x.uz', now), 0);
    limiter.registerFailure('a@x.uz', now);
  }
  assert.equal(limiter.retryAfterSeconds('a@x.uz', now), 60);
  assert.equal(limiter.retryAfterSeconds('b@x.uz', now), 0);
  assert.equal(limiter.retryAfterSeconds('a@x.uz', now + 60_001), 0);
});

test('login limiter resets after a successful login', () => {
  const limiter = new LoginAttemptLimiter(2, 60_000);
  limiter.registerFailure('a@x.uz');
  limiter.registerFailure('a@x.uz');
  assert.ok(limiter.retryAfterSeconds('a@x.uz') > 0);
  limiter.reset('a@x.uz');
  assert.equal(limiter.retryAfterSeconds('a@x.uz'), 0);
});

test('rejectNulls turns null in required PATCH fields into 400', () => {
  assert.throws(() => rejectNulls({ title: null }, ['title']), BadRequestException);
  assert.doesNotThrow(() => rejectNulls({ notes: null }, ['title']));
  assert.doesNotThrow(() => rejectNulls({}, ['title']));
});
