import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';

function reqEnv(key) {
  const value = String(process.env[key] || '').trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

async function main() {
  await connectDb(process.env.MONGODB_URI);

  const targetUserId = reqEnv('APPADMIN_TARGET_USERID');
  const targetPassword = reqEnv('APPADMIN_TARGET_PASSWORD');
  const targetEmail = reqEnv('APPADMIN_TARGET_EMAIL');

  const previousUserId = String(process.env.APPADMIN_PREVIOUS_USERID || '').trim();
  const targetName = String(process.env.APPADMIN_TARGET_NAME || 'App Admin').trim();
  const targetNumber = String(process.env.APPADMIN_TARGET_NUMBER || '8888888888').trim();

  let baseUser = await User.findOne({ userId: targetUserId });
  if (!baseUser && previousUserId) {
    baseUser = await User.findOne({ userId: previousUserId });
  }
  if (!baseUser) {
    baseUser = await User.findOne({ role: 'App Admin' });
  }

  const passwordHash = await bcrypt.hash(targetPassword, 10);
  const update = {
    name: targetName,
    number: targetNumber,
    userId: targetUserId,
    email: targetEmail.toLowerCase(),
    passwordHash,
    role: 'App Admin',
    roleName: 'App Admin',
    isAppAdmin: true,
    status: 'Active'
  };

  if (baseUser) {
    await User.updateOne({ _id: baseUser._id }, update);
    console.log(`App Admin updated successfully. userId: ${targetUserId}`);
  } else {
    await User.create({ ...update, companyId: null });
    console.log(`App Admin created successfully. userId: ${targetUserId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('App Admin rotate failed:', error.message);
    process.exit(1);
  });

