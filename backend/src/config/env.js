const REQUIRED_ENV_KEYS = ['MONGODB_URI', 'JWT_SECRET'];

const RECOMMENDED_ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'CORS_ALLOWED_ORIGINS',
  'COOKIE_AUTH_ENABLED',
  'COOKIE_SECURE',
  'COOKIE_SAMESITE',
  'JWT_EXPIRES_IN',
  'REDIS_URL'
];

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateEnv() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !hasValue(process.env[key]));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const missingRecommended = RECOMMENDED_ENV_KEYS.filter((key) => !hasValue(process.env[key]));
  if (missingRecommended.length > 0) {
    console.warn(`[config] Recommended env vars not set: ${missingRecommended.join(', ')}`);
  }
}

