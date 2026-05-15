import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:8080/api';
const CREDS = {
  admin: { userId: 'VIKASLLP-ADM1', password: 'Vikas@12345' },
  emp1: { userId: 'VIKASLLP-EMP1', password: 'Vikas@12345' },
  emp2: { userId: 'VIKASLLP-EMP2', password: 'Vikas@12345' }
};

function tag(prefix) {
  return `[E2E-${prefix}-${Date.now()}]`;
}

function isoPlusHours(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours, 0, 0, 0);
  return d.toISOString();
}

function todayIstIsoAt(hour) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date()).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${String(hour).padStart(2, '0')}:00:00`;
}

function pass(results, test, detail) {
  results.push({ test, ok: true, detail });
}

function fail(results, test, detail) {
  results.push({ test, ok: false, detail });
}

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, ok: response.ok, data };
}

async function login(userId, password) {
  const res = await req('/v1/auth/login', { method: 'POST', body: { userId, password } });
  if (!res.ok || !res.data?.token) {
    throw new Error(`Login failed for ${userId}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

async function run() {
  const results = [];
  const context = {
    created: {
      delegationId: null,
      checklistId: null,
      checklistPlanDate: null,
      workRequestId: null
    }
  };

  const health = await fetch('http://localhost:8080/health');
  pass(results, 'health', `status=${health.status}`);

  const admin = await login(CREDS.admin.userId, CREDS.admin.password);
  const emp1 = await login(CREDS.emp1.userId, CREDS.emp1.password);
  const emp2 = await login(CREDS.emp2.userId, CREDS.emp2.password);
  pass(results, 'login-admin', `user=${admin.userName}`);
  pass(results, 'login-emp1', `user=${emp1.userName}`);
  pass(results, 'login-emp2', `user=${emp2.userName}`);

  const projectName = 'Operations - Vikas LLP';
  const delDesc = tag('DELEGATION');
  const chkDesc = tag('CHECKLIST');
  const wrDesc = tag('WR');

  // Admin: create delegation for emp1
  {
    const create = await req('/v1/tasks/delegations', {
      method: 'POST',
      token: admin.token,
      body: {
        tasks: [
          {
            delegatedTo: [emp1.userName],
            description: delDesc,
            project: projectName,
            targetDate: isoPlusHours(24),
            priority: 'High',
            attachments: []
          }
        ]
      }
    });
    if (!create.ok || !create.data?.success) fail(results, 'create-delegation', JSON.stringify(create.data));
    else pass(results, 'create-delegation', create.data.message || 'success');
  }

  // Admin: create checklist for emp1
  {
    const create = await req('/v1/tasks/checklists', {
      method: 'POST',
      token: admin.token,
      body: [
        {
          employeeName: [emp1.userName],
          projectName,
          taskDescription: chkDesc,
          taskFrequency: 'Daily',
          startDate: todayIstIsoAt(10),
          dayOrDate: '',
          attachmentRequired: false
        }
      ]
    });
    if (!create.ok || !create.data?.success) fail(results, 'create-checklist', JSON.stringify(create.data));
    else pass(results, 'create-checklist', create.data.message || 'success');

    const generate = await req('/rpc/secure', {
      method: 'POST',
      token: admin.token,
      body: { method: 'createTasksDaily', params: [] }
    });
    if (!generate.ok || typeof generate.data !== 'number' || generate.data < 1) {
      fail(results, 'generate-checklist-midnight', JSON.stringify(generate.data));
    } else {
      pass(results, 'generate-checklist-midnight', `created=${generate.data}`);
    }
  }

  // Admin: create work request for emp1
  {
    const create = await req('/v1/tasks/work-requests', {
      method: 'POST',
      token: admin.token,
      body: {
        requests: [
          {
            requestFor: emp1.userName,
            project: projectName,
            description: wrDesc,
            deadline: isoPlusHours(12),
            notes: 'smoke test'
          }
        ]
      }
    });
    if (!create.ok || !create.data?.success) fail(results, 'create-work-request', JSON.stringify(create.data));
    else pass(results, 'create-work-request', create.data.message || 'success');
  }

  // Employee panel data checks
  {
    const d = await req('/v1/tasks/delegations', { token: emp1.token });
    const c = await req('/v1/tasks/checklists', { token: emp1.token });
    const w = await req('/v1/tasks/work-requests', { token: emp1.token });

    const del = (d.data || []).find((row) => String(row.taskDescription || '').includes(delDesc));
    const chk = (c.data || []).find((row) => String(row.taskDescription || row.description || '').includes(chkDesc));
    const wr = (w.data || []).find((row) => String(row.description || '').includes(wrDesc));

    if (!del) fail(results, 'emp1-sees-delegation', 'not found');
    else {
      context.created.delegationId = del.taskId;
      pass(results, 'emp1-sees-delegation', `taskId=${del.taskId}`);
    }

    if (!chk) fail(results, 'emp1-sees-checklist', 'not found');
    else {
      context.created.checklistId = chk.taskId;
      context.created.checklistPlanDate = chk.planDate;
      pass(results, 'emp1-sees-checklist', `taskId=${chk.taskId};freq=${chk.frequency || chk.taskFrequency}`);
    }

    if (!wr) fail(results, 'emp1-sees-work-request', 'not found');
    else {
      context.created.workRequestId = wr.requestId;
      pass(results, 'emp1-sees-work-request', `requestId=${wr.requestId}`);
    }
  }

  // Employee actions: submit delegation + checklist done + submit work request
  if (context.created.delegationId) {
    const res = await req('/v1/tasks/submit', {
      method: 'POST',
      token: emp1.token,
      body: { actionType: 'Task', id: context.created.delegationId, remarks: 'Done by E2E' }
    });
    if (!res.ok || !res.data?.success) fail(results, 'emp1-submit-delegation', JSON.stringify(res.data));
    else pass(results, 'emp1-submit-delegation', 'success');
  }

  if (context.created.checklistId) {
    const res = await req('/rpc/secure', {
      method: 'POST',
      token: emp1.token,
      body: {
        method: 'markChecklistTaskDone',
        params: [context.created.checklistId, context.created.checklistPlanDate, 'Done by E2E', []]
      }
    });
    const ok = res.ok && res.data === 'success';
    if (!ok) fail(results, 'emp1-submit-checklist', JSON.stringify(res.data));
    else pass(results, 'emp1-submit-checklist', 'success');
  }

  if (context.created.workRequestId) {
    const res = await req('/v1/tasks/submit', {
      method: 'POST',
      token: emp1.token,
      body: { actionType: 'Work Request', id: context.created.workRequestId, remarks: 'Done by E2E' }
    });
    if (!res.ok || !res.data?.success) fail(results, 'emp1-submit-work-request', JSON.stringify(res.data));
    else pass(results, 'emp1-submit-work-request', 'success');
  }

  // Admin approvals queue check + approve all
  {
    const approvals = await req('/v1/approvals', { token: admin.token });
    if (!approvals.ok) {
      fail(results, 'admin-approvals-load', JSON.stringify(approvals.data));
    } else {
      const d = (approvals.data?.delegations || []).find((row) => row.taskId === context.created.delegationId);
      const c = (approvals.data?.checklists || []).find((row) => row.taskId === context.created.checklistId);
      const w = (approvals.data?.workRequests || []).find((row) => row.requestId === context.created.workRequestId);
      pass(results, 'admin-approvals-load', `delegations=${(approvals.data?.delegations || []).length};checklists=${(approvals.data?.checklists || []).length};workRequests=${(approvals.data?.workRequests || []).length}`);

      if (d) {
        const upd = await req('/v1/tasks/status', {
          method: 'POST',
          token: admin.token,
          body: { type: 'Delegation', id: d.taskId, status: 'Completed', remarks: 'Approved by E2E' }
        });
        if (!upd.ok || !upd.data?.success) fail(results, 'admin-approve-delegation', JSON.stringify(upd.data));
        else pass(results, 'admin-approve-delegation', 'success');
      } else {
        fail(results, 'admin-approve-delegation', 'delegation item not found in approvals');
      }

      if (c) {
        const upd = await req('/v1/tasks/status', {
          method: 'POST',
          token: admin.token,
          body: { type: 'Checklist', id: c.taskId, status: 'Completed', remarks: 'Approved by E2E', planDate: c.planDate || context.created.checklistPlanDate }
        });
        if (!upd.ok || !upd.data?.success) fail(results, 'admin-approve-checklist', JSON.stringify(upd.data));
        else pass(results, 'admin-approve-checklist', 'success');
      } else {
        fail(results, 'admin-approve-checklist', 'checklist item not found in approvals');
      }

      if (w) {
        const upd = await req('/v1/tasks/status', {
          method: 'POST',
          token: admin.token,
          body: { type: 'Work Request', id: w.requestId, status: 'Completed', remarks: 'Approved by E2E' }
        });
        if (!upd.ok || !upd.data?.success) fail(results, 'admin-approve-work-request', JSON.stringify(upd.data));
        else pass(results, 'admin-approve-work-request', 'success');
      } else {
        fail(results, 'admin-approve-work-request', 'work request item not found in approvals');
      }
    }
  }

  // Coverage across modules and submodules
  const smokeEndpoints = [
    '/v1/dashboard',
    '/v1/dashboard/employee',
    '/v1/tasks/pending',
    '/v1/tasks/submissions',
    '/v1/reports',
    '/v1/reports/employee-performance',
    '/v1/kra/master',
    '/v1/mis',
    '/v1/admin/projects',
    '/v1/admin/users',
    '/v1/admin/hierarchy',
    '/v1/fms/tasks'
  ];

  for (const ep of smokeEndpoints) {
    const token = ep.includes('/dashboard/employee') ? emp2.token : admin.token;
    const res = await req(ep, { token });
    if (res.ok) {
      const shape = Array.isArray(res.data) ? `array:${res.data.length}` : 'object';
      pass(results, `smoke:${ep}`, shape);
    } else {
      fail(results, `smoke:${ep}`, `${res.status} ${JSON.stringify(res.data)}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  const summary = {
    baseUrl: BASE,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
    failedItems: failed
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length) process.exitCode = 1;
}

run().catch((error) => {
  console.error(JSON.stringify({ fatal: true, message: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
});
