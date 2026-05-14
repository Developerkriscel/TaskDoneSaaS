import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';

function requiredEnv(key) {
  const value = String(process.env[key] || '').trim();
  if (!value) {
    throw new Error(`${key} is required for admin bootstrap`);
  }
  return value;
}

async function upsertUser({ name, number, userId, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const update = {
    name,
    number,
    userId,
    email,
    passwordHash,
    role,
    roleName: role,
    isAppAdmin: role === 'App Admin',
    companyId: null,
    status: 'Active'
  };

  await User.findOneAndUpdate({ userId }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function main() {
  await connectDb(process.env.MONGODB_URI);

  const includeSuperAdmin = String(process.env.BOOTSTRAP_INCLUDE_SUPERADMIN || 'false').toLowerCase() === 'true';
  if (includeSuperAdmin) {
    await upsertUser({
      name: process.env.BOOTSTRAP_SUPERADMIN_NAME || 'Super Admin',
      number: process.env.BOOTSTRAP_SUPERADMIN_NUMBER || '9999999999',
      userId: process.env.BOOTSTRAP_SUPERADMIN_USERID || 'superadmin',
      email: requiredEnv('BOOTSTRAP_SUPERADMIN_EMAIL'),
      password: requiredEnv('BOOTSTRAP_SUPERADMIN_PASSWORD'),
      role: 'Super Admin'
    });
  }

  await upsertUser({
    name: process.env.BOOTSTRAP_APPADMIN_NAME || 'App Admin',
    number: process.env.BOOTSTRAP_APPADMIN_NUMBER || '8888888888',
    userId: process.env.BOOTSTRAP_APPADMIN_USERID || 'appadmin',
    email: requiredEnv('BOOTSTRAP_APPADMIN_EMAIL'),
    password: requiredEnv('BOOTSTRAP_APPADMIN_PASSWORD'),
    role: 'App Admin'
  });

  console.log(
    includeSuperAdmin
      ? 'Bootstrap complete: Super Admin and App Admin are ready.'
      : 'Bootstrap complete: App Admin is ready. Super Admin was not modified.'
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  process.exit(1);
});
