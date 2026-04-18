import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';

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

  await upsertUser({
    name: process.env.BOOTSTRAP_SUPERADMIN_NAME || 'Super Admin',
    number: process.env.BOOTSTRAP_SUPERADMIN_NUMBER || '9999999999',
    userId: process.env.BOOTSTRAP_SUPERADMIN_USERID || 'superadmin',
    email: process.env.BOOTSTRAP_SUPERADMIN_EMAIL || 'superadmin@taskdone.local',
    password: process.env.BOOTSTRAP_SUPERADMIN_PASSWORD || 'SuperAdmin@123',
    role: 'Super Admin'
  });

  await upsertUser({
    name: process.env.BOOTSTRAP_APPADMIN_NAME || 'App Admin',
    number: process.env.BOOTSTRAP_APPADMIN_NUMBER || '8888888888',
    userId: process.env.BOOTSTRAP_APPADMIN_USERID || 'appadmin',
    email: process.env.BOOTSTRAP_APPADMIN_EMAIL || 'appadmin@taskdone.local',
    password: process.env.BOOTSTRAP_APPADMIN_PASSWORD || 'AppAdmin@123',
    role: 'App Admin'
  });

  console.log('Bootstrap complete: Super Admin and App Admin are ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message);
  process.exit(1);
});
