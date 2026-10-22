export function validateEnvironment(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!config[key] || typeof config[key] !== 'string') {
      throw new Error(`${key} environment qiymati majburiy`);
    }
  }
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (String(config[key]).length < 32) {
      throw new Error(`${key} kamida 32 belgidan iborat bo‘lishi kerak`);
    }
  }
  if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    throw new Error('Access va refresh token secret qiymatlari har xil bo‘lishi kerak');
  }
  const refreshDays = Number(config.REFRESH_TOKEN_TTL_DAYS ?? 7);
  if (!Number.isInteger(refreshDays) || refreshDays < 1 || refreshDays > 90) {
    throw new Error('REFRESH_TOKEN_TTL_DAYS 1 dan 90 gacha butun son bo‘lishi kerak');
  }
  if (config.NODE_ENV === 'production') {
    const insecureValues = ['replace-with-at-least-32-random-characters', 'replace-with-another-32-random-characters'];
    if (insecureValues.includes(String(config.JWT_ACCESS_SECRET)) || insecureValues.includes(String(config.JWT_REFRESH_SECRET))) {
      throw new Error('Production muhitida namunaviy JWT secretlardan foydalanish taqiqlanadi');
    }
    if (config.SEED_ADMIN_PASSWORD === 'ChangeMe123!') {
      throw new Error('Production muhitida standart admin parolidan foydalanish taqiqlanadi');
    }
  }
  return config;
}
