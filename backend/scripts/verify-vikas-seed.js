import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../src/config/db.js';
import { Company } from '../src/models/Company.js';
import { User } from '../src/models/User.js';
import { DelegationTask } from '../src/models/DelegationTask.js';
import { WorkRequest } from '../src/models/WorkRequest.js';
import { ChecklistTask } from '../src/models/ChecklistTask.js';
import { getMisData, getEmployeePerformanceReport } from '../src/services/coreTaskService.js';

async function run() {
  await connectDb(process.env.MONGODB_URI);

  const company = await Company.findOne({ name: /^vikas llp$/i }).lean();
  if (!company) {
    throw new Error('Company vikas llp not found');
  }

  const users = await User.find({ companyId: company._id }).select('name userId role').lean();
  const userIds = users.map((u) => u._id);

  const [delegation, workRequests, checklist] = await Promise.all([
    DelegationTask.countDocuments({ delegatedToUser: { $in: userIds }, description: /^\[SEED VIKAS\]/ }),
    WorkRequest.countDocuments({ requestForUser: { $in: userIds }, notes: /\[SEED VIKAS\]/ }),
    ChecklistTask.countDocuments({ user: { $in: userIds }, description: /^\[SEED VIKAS\]/ })
  ]);

  const misRows = await getMisData('Vikas Admin', 'Admin', {});
  const performance = await getEmployeePerformanceReport('Vikas Admin', 'Admin', {});

  console.log(
    JSON.stringify(
      {
        company: company.name,
        users,
        seededCounts: { delegation, workRequests, checklist },
        misRows,
        performance
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
