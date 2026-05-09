import 'dotenv/config';
import mongoose from 'mongoose';

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const sourceUri = requiredEnv('SOURCE_MONGODB_URI');
  const targetUri = requiredEnv('TARGET_MONGODB_URI');
  const dropTarget = String(process.env.MIGRATION_DROP_TARGET || 'false').toLowerCase() === 'true';
  const batchSize = Number(process.env.MIGRATION_BATCH_SIZE || 500);

  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  const targetConn = await mongoose.createConnection(targetUri).asPromise();

  try {
    const sourceCollections = await sourceConn.db.listCollections({}, { nameOnly: true }).toArray();
    const names = sourceCollections
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.'));

    if (names.length === 0) {
      console.log('No collections found on source DB.');
      return;
    }

    for (const name of names) {
      const sourceCol = sourceConn.db.collection(name);
      const targetCol = targetConn.db.collection(name);

      if (dropTarget) {
        await targetCol.deleteMany({});
      }

      const total = await sourceCol.countDocuments({});
      console.log(`Migrating ${name}: ${total} documents`);

      let migrated = 0;
      const cursor = sourceCol.find({});
      let ops = [];

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        ops.push({
          replaceOne: {
            filter: { _id: doc._id },
            replacement: doc,
            upsert: true
          }
        });

        if (ops.length >= batchSize) {
          await targetCol.bulkWrite(ops, { ordered: false });
          migrated += ops.length;
          console.log(`  ${name}: ${migrated}/${total}`);
          ops = [];
        }
      }

      if (ops.length > 0) {
        await targetCol.bulkWrite(ops, { ordered: false });
        migrated += ops.length;
      }

      const targetCount = await targetCol.countDocuments({});
      console.log(`Done ${name}: migrated=${migrated}, targetCount=${targetCount}`);
    }

    console.log('Migration completed successfully.');
  } finally {
    await sourceConn.close();
    await targetConn.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exit(1);
  });

