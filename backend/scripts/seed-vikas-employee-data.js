import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDb } from '../src/config/db.js';
import { Company } from '../src/models/Company.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { DelegationTask } from '../src/models/DelegationTask.js';
import { WorkRequest } from '../src/models/WorkRequest.js';
import { ChecklistTask } from '../src/models/ChecklistTask.js';
import { HierarchyGroup } from '../src/models/HierarchyGroup.js';

const TAG = '[SEED VIKAS]';

async function getNextLegacyId(Model, field) {
  const last = await Model.findOne().sort({ [field]: -1 }).lean();
  return Number(last?.[field] || 0) + 1;
}

async function ensureUser({ companyId, name, userId, email, role, roleName, password }) {
  const existing = await User.findOne({ userId }).lean();
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await User.create({
    companyId,
    name,
    userId,
    email,
    passwordHash,
    role,
    roleName,
    isAppAdmin: false,
    status: 'Active'
  });
  return created.toObject();
}

function daysFromNow(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function run() {
  await connectDb(process.env.MONGODB_URI);

  const company = await Company.findOne({ name: /^vikas llp$/i }).lean();
  if (!company) {
    throw new Error('Company "vikas llp" was not found. Create tenant first.');
  }

  const superAdmin = await User.findOne({ companyId: company._id, role: 'Super Admin' }).lean();
  if (!superAdmin) {
    throw new Error('Super Admin not found for vikas llp.');
  }

  const admin = await ensureUser({
    companyId: company._id,
    name: 'Vikas Admin',
    userId: 'VIKASLLP-ADM1',
    email: 'admin.vikasllp@taskdone.local',
    role: 'Admin',
    roleName: 'Admin',
    password: 'Vikas@12345'
  });

  const employeeA = await ensureUser({
    companyId: company._id,
    name: 'Aman Vikas',
    userId: 'VIKASLLP-EMP1',
    email: 'aman.vikasllp@taskdone.local',
    role: 'Employee',
    roleName: 'Employee',
    password: 'Vikas@12345'
  });

  const employeeB = await ensureUser({
    companyId: company._id,
    name: 'Neha Vikas',
    userId: 'VIKASLLP-EMP2',
    email: 'neha.vikasllp@taskdone.local',
    role: 'Employee',
    roleName: 'Employee',
    password: 'Vikas@12345'
  });

  const project = await Project.findOneAndUpdate(
    { companyId: company._id, name: 'Operations - Vikas LLP' },
    { companyId: company._id, name: 'Operations - Vikas LLP', status: 'Active', createdBy: admin._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  await HierarchyGroup.findOneAndUpdate(
    { companyId: company._id, adminUser: admin._id },
    {
      companyId: company._id,
      adminUser: admin._id,
      employeeUsers: [employeeA._id, employeeB._id],
      legacyAdminName: admin.name,
      legacyEmployeeNames: [employeeA.name, employeeB.name]
    },
    { upsert: true, new: true }
  );

  await Promise.all([
    DelegationTask.deleteMany({
      delegatedToUser: { $in: [employeeA._id, employeeB._id] },
      description: { $regex: '^\\[SEED VIKAS\\]' }
    }),
    WorkRequest.deleteMany({
      requestForUser: { $in: [employeeA._id, employeeB._id] },
      notes: { $regex: '\\[SEED VIKAS\\]' }
    }),
    ChecklistTask.deleteMany({
      user: { $in: [employeeA._id, employeeB._id] },
      description: { $regex: '^\\[SEED VIKAS\\]' }
    })
  ]);

  let nextDelegationId = await getNextLegacyId(DelegationTask, 'legacyTaskId');
  let nextWorkRequestId = await getNextLegacyId(WorkRequest, 'legacyRequestId');
  let nextChecklistId = await getNextLegacyId(ChecklistTask, 'legacyTaskId');

  const delegationRows = [
    {
      legacyTaskId: nextDelegationId++,
      delegatedByUser: admin._id,
      delegatedToUser: employeeA._id,
      description: `${TAG} Prepare weekly sales dashboard`,
      project: project._id,
      targetDate: daysFromNow(-2),
      status: 'Completed',
      priority: 'High',
      approvalDate: daysFromNow(-2),
      onTimeStatus: 'On Time',
      totalDelays: 0,
      finalRemarks: 'Completed with QA check.'
    },
    {
      legacyTaskId: nextDelegationId++,
      delegatedByUser: admin._id,
      delegatedToUser: employeeA._id,
      description: `${TAG} Resolve invoice mismatch queue`,
      project: project._id,
      targetDate: daysFromNow(-7),
      status: 'Completed',
      priority: 'Medium',
      approvalDate: daysFromNow(-3),
      onTimeStatus: 'Late',
      totalDelays: 4,
      finalRemarks: 'Delayed due to external dependency.'
    },
    {
      legacyTaskId: nextDelegationId++,
      delegatedByUser: admin._id,
      delegatedToUser: employeeA._id,
      description: `${TAG} Complete partner onboarding checklist`,
      project: project._id,
      targetDate: daysFromNow(2),
      status: 'Pending',
      priority: 'High'
    },
    {
      legacyTaskId: nextDelegationId++,
      delegatedByUser: superAdmin._id,
      delegatedToUser: employeeB._id,
      description: `${TAG} Validate KRA evidence attachments`,
      project: project._id,
      targetDate: daysFromNow(-1),
      status: 'Send for Approval',
      priority: 'Medium',
      actionDate: daysFromNow(0),
      finalRemarksByDoer: 'Ready for approval'
    },
    {
      legacyTaskId: nextDelegationId++,
      delegatedByUser: admin._id,
      delegatedToUser: employeeB._id,
      description: `${TAG} Correct MIS categorization tags`,
      project: project._id,
      targetDate: daysFromNow(-5),
      status: 'Rework',
      priority: 'Low',
      reworkRemark: 'Reclassify delayed items and re-submit.'
    },
    {
      legacyTaskId: nextDelegationId++,
      delegatedByUser: admin._id,
      delegatedToUser: employeeB._id,
      description: `${TAG} Finalize month-end closure notes`,
      project: project._id,
      targetDate: daysFromNow(-3),
      status: 'Completed',
      priority: 'Medium',
      approvalDate: daysFromNow(-3),
      onTimeStatus: 'On Time',
      totalDelays: 0,
      finalRemarks: 'Completed on time.'
    }
  ];

  const workRequestRows = [
    {
      legacyRequestId: nextWorkRequestId++,
      requestedByUser: admin._id,
      requestForUser: employeeA._id,
      description: `${TAG} Reconcile cashbook entries`,
      project: project._id,
      deadline: daysFromNow(-3),
      status: 'Completed',
      completionDate: daysFromNow(-2),
      delayDays: 0,
      onTimeStatus: 'On Time',
      notes: `${TAG} monthly finance check`
    },
    {
      legacyRequestId: nextWorkRequestId++,
      requestedByUser: admin._id,
      requestForUser: employeeA._id,
      description: `${TAG} Submit vendor due report`,
      project: project._id,
      deadline: daysFromNow(-6),
      status: 'Completed',
      completionDate: daysFromNow(-2),
      delayDays: 4,
      onTimeStatus: 'Late',
      notes: `${TAG} delayed vendor data`
    },
    {
      legacyRequestId: nextWorkRequestId++,
      requestedByUser: employeeA._id,
      requestForUser: employeeB._id,
      description: `${TAG} Support stock verification`,
      project: project._id,
      deadline: daysFromNow(3),
      status: 'Pending',
      notes: `${TAG} warehouse slot B`
    },
    {
      legacyRequestId: nextWorkRequestId++,
      requestedByUser: admin._id,
      requestForUser: employeeB._id,
      description: `${TAG} Prepare audit handover packet`,
      project: project._id,
      deadline: daysFromNow(-1),
      status: 'Send for Approval',
      completionDate: daysFromNow(0),
      remarksByDoer: 'Packet uploaded',
      notes: `${TAG} awaiting approval`
    }
  ];

  const checklistRows = [
    {
      legacyTaskId: nextChecklistId++,
      user: employeeA._id,
      delegatedByUser: admin._id,
      description: `${TAG} Daily sales reconciliation`,
      frequency: 'Daily',
      project: project._id,
      planDate: daysFromNow(-2),
      actualDate: daysFromNow(-2),
      approvalStatus: 'Completed',
      onTimeStatus: 'On Time',
      totalDelay: 0,
      sourceType: 'Manual'
    },
    {
      legacyTaskId: nextChecklistId++,
      user: employeeA._id,
      delegatedByUser: admin._id,
      description: `${TAG} Daily pending follow-up`,
      frequency: 'Daily',
      project: project._id,
      planDate: daysFromNow(-4),
      actualDate: daysFromNow(-2),
      approvalStatus: 'Completed',
      onTimeStatus: 'Late',
      totalDelay: 2,
      sourceType: 'Manual'
    },
    {
      legacyTaskId: nextChecklistId++,
      user: employeeB._id,
      delegatedByUser: admin._id,
      description: `${TAG} Weekly dispatch closure`,
      frequency: 'Weekly',
      project: project._id,
      planDate: daysFromNow(1),
      approvalStatus: 'Pending',
      sourceType: 'Manual'
    },
    {
      legacyTaskId: nextChecklistId++,
      user: employeeB._id,
      delegatedByUser: admin._id,
      description: `${TAG} Weekly inventory snapshot`,
      frequency: 'Weekly',
      project: project._id,
      planDate: daysFromNow(-1),
      actualDate: daysFromNow(-1),
      approvalStatus: 'Completed',
      onTimeStatus: 'On Time',
      totalDelay: 0,
      sourceType: 'Manual'
    }
  ];

  await Promise.all([
    DelegationTask.insertMany(delegationRows),
    WorkRequest.insertMany(workRequestRows),
    ChecklistTask.insertMany(checklistRows)
  ]);

  const summary = {
    company: company.name,
    users: [superAdmin.userId, admin.userId, employeeA.userId, employeeB.userId],
    inserted: {
      delegationTasks: delegationRows.length,
      workRequests: workRequestRows.length,
      checklistTasks: checklistRows.length
    }
  };

  console.log('Seed completed:', JSON.stringify(summary, null, 2));
}

run()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
