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
  return config;
}
