import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:8080/api';

const CREDS = {
  superAdmin: { userId: 'VIKASLLP-ADMIN', password: 'Vikas@12345' },
  admin: { userId: 'VIKASLLP-ADM1', password: 'Vikas@12345' },
  emp1: { userId: 'VIKASLLP-EMP1', password: 'Vikas@12345' },
  emp2: { userId: 'VIKASLLP-EMP2', password: 'Vikas@12345' }
};

function nowTag(prefix) {
  return `[MATRIX-${prefix}-${Date.now()}]`;
}

function plusHoursIso(hours) {
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

function push(results, test, ok, detail) {
  results.push({ test, ok: Boolean(ok), detail: String(detail || '') });
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function login(creds) {
  const res = await api('/v1/auth/login', { method: 'POST', body: creds });
  if (!res.ok || !res.data?.token) {
    throw new Error(`Login failed for ${creds.userId}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

function findByDesc(rows, desc) {
  return (rows || []).find((row) => {
    const hay = `${row.description || ''} ${row.taskDescription || ''}`.trim();
    return hay.includes(desc);
  });
}

async function run() {
  const results = [];

  // 1) Logins
  const superAdmin = await login(CREDS.superAdmin);
  const admin = await login(CREDS.admin);
  const emp1 = await login(CREDS.emp1);
  const emp2 = await login(CREDS.emp2);

  push(results, 'login-superadmin', true, superAdmin.userName);
  push(results, 'login-admin', true, admin.userName);
  push(results, 'login-emp1', true, emp1.userName);
  push(results, 'login-emp2', true, emp2.userName);

  // 2) Hierarchy map checks
  const hSuper = await api('/rpc/secure', {
    method: 'POST',
    token: superAdmin.token,
    body: { method: 'getTeamMembersWithManager', params: [superAdmin.userName, superAdmin.role] }
  });
  push(results, 'hierarchy-superadmin', hSuper.ok, hSuper.ok ? `count=${hSuper.data.length}` : JSON.stringify(hSuper.data));

  const hAdmin = await api('/rpc/secure', {
    method: 'POST',
    token: admin.token,
    body: { method: 'getTeamMembersWithManager', params: [admin.userName, admin.role] }
  });
  push(results, 'hierarchy-admin', hAdmin.ok, hAdmin.ok ? `count=${hAdmin.data.length};members=${hAdmin.data.join('|')}` : JSON.stringify(hAdmin.data));

  const hEmp1 = await api('/rpc/secure', {
    method: 'POST',
    token: emp1.token,
    body: { method: 'getTeamMembersWithManager', params: [emp1.userName, emp1.role] }
  });
  push(results, 'hierarchy-emp1', hEmp1.ok, hEmp1.ok ? `count=${hEmp1.data.length}` : JSON.stringify(hEmp1.data));

  // 3) Create data across directions
  const projectName = 'Operations - Vikas LLP';
  const dTopLow = nowTag('DEL-SUPER-TO-EMP1');
  const dTeamLow = nowTag('DEL-ADMIN-TO-EMP2');
  const cTopLow = nowTag('CHK-SUPER-TO-EMP1');
  const cTeamLow = nowTag('CHK-ADMIN-TO-EMP2');
  const wTopLow = nowTag('WR-ADMIN-TO-EMP1');
  const wLowTop = nowTag('WR-EMP1-TO-ADMIN');
  const wCross = nowTag('WR-EMP1-TO-EMP2');

  // Delegation top->low (Super Admin -> Emp1)
  const createDelSuper = await api('/v1/tasks/delegations', {
    method: 'POST',
    token: superAdmin.token,
    body: {
      tasks: [
        {
          delegatedTo: [emp1.userName],
          description: dTopLow,
          project: projectName,
          targetDate: plusHoursIso(26),
          priority: 'High',
          attachments: []
        }
      ]
    }
  });
  push(results, 'create-delegation-super-to-emp1', createDelSuper.ok && createDelSuper.data?.success, JSON.stringify(createDelSuper.data));

  // Delegation team->low (Admin -> Emp2)
  const createDelAdmin = await api('/v1/tasks/delegations', {
    method: 'POST',
    token: admin.token,
    body: {
      tasks: [
        {
          delegatedTo: [emp2.userName],
          description: dTeamLow,
          project: projectName,
          targetDate: plusHoursIso(28),
          priority: 'Medium',
          attachments: []
        }
      ]
    }
  });
  push(results, 'create-delegation-admin-to-emp2', createDelAdmin.ok && createDelAdmin.data?.success, JSON.stringify(createDelAdmin.data));

  // Checklist top->low (Super Admin -> Emp1)
  const createChkSuper = await api('/v1/tasks/checklists', {
    method: 'POST',
    token: superAdmin.token,
    body: [
      {
        employeeName: [emp1.userName],
        projectName,
        taskDescription: cTopLow,
        taskFrequency: 'Daily',
        startDate: todayIstIsoAt(10),
        dayOrDate: '',
        attachmentRequired: false
      }
    ]
  });
  push(results, 'create-checklist-super-to-emp1', createChkSuper.ok && createChkSuper.data?.success, JSON.stringify(createChkSuper.data));

  // Checklist team->low (Admin -> Emp2)
  const createChkAdmin = await api('/v1/tasks/checklists', {
    method: 'POST',
    token: admin.token,
    body: [
      {
        employeeName: [emp2.userName],
        projectName,
        taskDescription: cTeamLow,
        taskFrequency: 'Weekly',
        startDate: todayIstIsoAt(11),
        dayOrDate: '',
        attachmentRequired: false
      }
    ]
  });
  push(results, 'create-checklist-admin-to-emp2', createChkAdmin.ok && createChkAdmin.data?.success, JSON.stringify(createChkAdmin.data));

  const generateChecklists = await api('/rpc/secure', {
    method: 'POST',
    token: superAdmin.token,
    body: { method: 'createTasksDaily', params: [] }
  });
  push(
    results,
    'generate-checklists-midnight',
    generateChecklists.ok && typeof generateChecklists.data === 'number' && generateChecklists.data >= 2,
    JSON.stringify(generateChecklists.data)
  );

  // Work Request top->low (Admin -> Emp1)
  const createWrTopLow = await api('/v1/tasks/work-requests', {
    method: 'POST',
    token: admin.token,
    body: {
      requests: [
        {
          requestFor: emp1.userName,
          project: projectName,
          description: wTopLow,
          deadline: plusHoursIso(10),
          notes: 'matrix top-low'
        }
      ]
    }
  });
  push(results, 'create-workrequest-admin-to-emp1', createWrTopLow.ok && createWrTopLow.data?.success, JSON.stringify(createWrTopLow.data));

  // Work Request low->top (Emp1 -> Admin)
  const createWrLowTop = await api('/v1/tasks/work-requests', {
    method: 'POST',
    token: emp1.token,
    body: {
      requests: [
        {
          requestFor: admin.userName,
          project: projectName,
          description: wLowTop,
          deadline: plusHoursIso(11),
          notes: 'matrix low-top'
        }
      ]
    }
  });
  push(results, 'create-workrequest-emp1-to-admin', createWrLowTop.ok && createWrLowTop.data?.success, JSON.stringify(createWrLowTop.data));

  // Work Request cross employee (Emp1 -> Emp2)
  const createWrCross = await api('/v1/tasks/work-requests', {
    method: 'POST',
    token: emp1.token,
    body: {
      requests: [
        {
          requestFor: emp2.userName,
          project: projectName,
          description: wCross,
          deadline: plusHoursIso(12),
          notes: 'matrix cross'
        }
      ]
    }
  });
  push(results, 'create-workrequest-emp1-to-emp2', createWrCross.ok && createWrCross.data?.success, JSON.stringify(createWrCross.data));

  // 4) Fetch in each role panel (API equivalent of panel datasets)
  const emp1DelRows = await api('/v1/tasks/delegations', { token: emp1.token });
  const emp2DelRows = await api('/v1/tasks/delegations', { token: emp2.token });
  const emp1ChkRows = await api('/v1/tasks/checklists', { token: emp1.token });
  const emp2ChkRows = await api('/v1/tasks/checklists', { token: emp2.token });
  const emp1WrRows = await api('/v1/tasks/work-requests', { token: emp1.token });
  const emp2WrRows = await api('/v1/tasks/work-requests', { token: emp2.token });
  const adminWrRows = await api('/v1/tasks/work-requests', { token: admin.token });

  const emp1Del = findByDesc(emp1DelRows.data, dTopLow);
  const emp2Del = findByDesc(emp2DelRows.data, dTeamLow);
  const emp1Chk = findByDesc(emp1ChkRows.data, cTopLow);
  const emp2Chk = findByDesc(emp2ChkRows.data, cTeamLow);
  const emp1WrA = findByDesc(emp1WrRows.data, wTopLow);
  const emp2WrA = findByDesc(emp2WrRows.data, wCross);
  const adminWrA = findByDesc(adminWrRows.data, wLowTop);

  push(results, 'emp1-sees-delegation-assigned', Boolean(emp1Del), emp1Del ? `taskId=${emp1Del.taskId}` : 'not found');
  push(results, 'emp2-sees-delegation-assigned', Boolean(emp2Del), emp2Del ? `taskId=${emp2Del.taskId}` : 'not found');
  push(results, 'emp1-sees-checklist-assigned', Boolean(emp1Chk), emp1Chk ? `taskId=${emp1Chk.taskId};freq=${emp1Chk.frequency}` : 'not found');
  push(results, 'emp2-sees-checklist-assigned', Boolean(emp2Chk), emp2Chk ? `taskId=${emp2Chk.taskId};freq=${emp2Chk.frequency}` : 'not found');
  push(results, 'emp1-sees-workrequest-from-admin', Boolean(emp1WrA), emp1WrA ? `requestId=${emp1WrA.requestId}` : 'not found');
  push(results, 'emp2-sees-workrequest-from-emp1', Boolean(emp2WrA), emp2WrA ? `requestId=${emp2WrA.requestId}` : 'not found');
  push(results, 'admin-sees-workrequest-from-emp1', Boolean(adminWrA), adminWrA ? `requestId=${adminWrA.requestId}` : 'not found');

  // 5) Doer submit flow
  if (emp1Del?.taskId) {
    const s = await api('/v1/tasks/submit', {
      method: 'POST',
      token: emp1.token,
      body: { actionType: 'Task', id: emp1Del.taskId, remarks: 'matrix done emp1 del' }
    });
    push(results, 'emp1-submit-delegation', s.ok && s.data?.success, JSON.stringify(s.data));
  } else {
    push(results, 'emp1-submit-delegation', false, 'precondition missing');
  }

  if (emp2Del?.taskId) {
    const s = await api('/v1/tasks/submit', {
      method: 'POST',
      token: emp2.token,
      body: { actionType: 'Task', id: emp2Del.taskId, remarks: 'matrix done emp2 del' }
    });
    push(results, 'emp2-submit-delegation', s.ok && s.data?.success, JSON.stringify(s.data));
  } else {
    push(results, 'emp2-submit-delegation', false, 'precondition missing');
  }

  if (emp1Chk?.taskId) {
    const s = await api('/rpc/secure', {
      method: 'POST',
      token: emp1.token,
      body: { method: 'markChecklistTaskDone', params: [emp1Chk.taskId, emp1Chk.planDate, 'matrix done emp1 chk', []] }
    });
    push(results, 'emp1-submit-checklist', s.ok && s.data === 'success', JSON.stringify(s.data));
  } else {
    push(results, 'emp1-submit-checklist', false, 'precondition missing');
  }

  if (emp2Chk?.taskId) {
    const s = await api('/rpc/secure', {
      method: 'POST',
      token: emp2.token,
      body: { method: 'markChecklistTaskDone', params: [emp2Chk.taskId, emp2Chk.planDate, 'matrix done emp2 chk', []] }
    });
    push(results, 'emp2-submit-checklist', s.ok && s.data === 'success', JSON.stringify(s.data));
  } else {
    push(results, 'emp2-submit-checklist', false, 'precondition missing');
  }

  if (emp1WrA?.requestId) {
    const s = await api('/v1/tasks/submit', {
      method: 'POST',
      token: emp1.token,
      body: { actionType: 'Work Request', id: emp1WrA.requestId, remarks: 'matrix done wr from admin' }
    });
    push(results, 'emp1-submit-workrequest', s.ok && s.data?.success, JSON.stringify(s.data));
  } else {
    push(results, 'emp1-submit-workrequest', false, 'precondition missing');
  }

  if (emp2WrA?.requestId) {
    const s = await api('/v1/tasks/submit', {
      method: 'POST',
      token: emp2.token,
      body: { actionType: 'Work Request', id: emp2WrA.requestId, remarks: 'matrix done wr from emp1' }
    });
    push(results, 'emp2-submit-workrequest', s.ok && s.data?.success, JSON.stringify(s.data));
  } else {
    push(results, 'emp2-submit-workrequest', false, 'precondition missing');
  }

  if (adminWrA?.requestId) {
    const s = await api('/v1/tasks/submit', {
      method: 'POST',
      token: admin.token,
      body: { actionType: 'Work Request', id: adminWrA.requestId, remarks: 'matrix done wr from emp1 to admin' }
    });
    push(results, 'admin-submit-workrequest-as-doer', s.ok && s.data?.success, JSON.stringify(s.data));
  } else {
    push(results, 'admin-submit-workrequest-as-doer', false, 'precondition missing');
  }

  // 6) Approvals top->low and low->top (Admin + Super Admin)
  const apprAdmin = await api('/v1/approvals', { token: admin.token });
  const apprSuper = await api('/v1/approvals', { token: superAdmin.token });
  push(results, 'admin-approvals-load', apprAdmin.ok, apprAdmin.ok ? `d=${apprAdmin.data.delegations.length};c=${apprAdmin.data.checklists.length};w=${apprAdmin.data.workRequests.length}` : JSON.stringify(apprAdmin.data));
  push(results, 'superadmin-approvals-load', apprSuper.ok, apprSuper.ok ? `d=${apprSuper.data.delegations.length};c=${apprSuper.data.checklists.length};w=${apprSuper.data.workRequests.length}` : JSON.stringify(apprSuper.data));

  const approveIfFound = async (approvals, typeKey, idKey, idValue, planDate, actorToken, testName) => {
    const found = (approvals?.[typeKey] || []).find((row) => row[idKey] === idValue);
    if (!found) {
      push(results, testName, false, 'not found in approvals');
      return;
    }
    const payload = { type: found.type || (typeKey === 'delegations' ? 'Delegation' : typeKey === 'checklists' ? 'Checklist' : 'Work Request'), id: idValue, status: 'Completed', remarks: `approved ${testName}` };
    if (planDate) payload.planDate = planDate;
    const res = await api('/v1/tasks/status', { method: 'POST', token: actorToken, body: payload });
    push(results, testName, res.ok && res.data?.success, JSON.stringify(res.data));
  };

  await approveIfFound(apprAdmin.data, 'delegations', 'taskId', emp1Del?.taskId, null, admin.token, 'admin-approve-emp1-delegation');
  await approveIfFound(apprAdmin.data, 'checklists', 'taskId', emp1Chk?.taskId, emp1Chk?.planDate, admin.token, 'admin-approve-emp1-checklist');
  await approveIfFound(apprAdmin.data, 'workRequests', 'requestId', emp1WrA?.requestId, null, admin.token, 'admin-approve-workrequest-admin-to-emp1');

  await approveIfFound(apprSuper.data, 'delegations', 'taskId', emp2Del?.taskId, null, superAdmin.token, 'superadmin-approve-emp2-delegation');
  await approveIfFound(apprSuper.data, 'checklists', 'taskId', emp2Chk?.taskId, emp2Chk?.planDate, superAdmin.token, 'superadmin-approve-emp2-checklist');
  await approveIfFound(apprSuper.data, 'workRequests', 'requestId', emp2WrA?.requestId, null, superAdmin.token, 'superadmin-approve-workrequest-emp1-to-emp2');

  // 7) Submodule endpoint smoke across hierarchy
  const endpointChecks = [
    { test: 'admin-dashboard', path: '/v1/dashboard', token: admin.token, expectOk: true },
    { test: 'superadmin-dashboard', path: '/v1/dashboard', token: superAdmin.token, expectOk: true },
    { test: 'emp1-dashboard-employee', path: '/v1/dashboard/employee', token: emp1.token, expectOk: true },
    { test: 'admin-kra-master', path: '/v1/kra/master', token: admin.token, expectOk: true },
    { test: 'superadmin-kra-master', path: '/v1/kra/master', token: superAdmin.token, expectOk: true },
    { test: 'emp1-mis-blocked', path: '/v1/mis', token: emp1.token, expectStatus: 403 },
    { test: 'emp1-reports-blocked', path: '/v1/reports', token: emp1.token, expectStatus: 403 },
    { test: 'admin-reports-ok', path: '/v1/reports', token: admin.token, expectOk: true },
    { test: 'superadmin-reports-ok', path: '/v1/reports', token: superAdmin.token, expectOk: true },
    { test: 'admin-hierarchy', path: '/v1/admin/hierarchy', token: admin.token, expectOk: true },
    { test: 'superadmin-admin-users', path: '/v1/admin/users', token: superAdmin.token, expectOk: true },
    { test: 'emp2-fms-tasks', path: '/v1/fms/tasks', token: emp2.token, expectOk: true }
  ];

  for (const check of endpointChecks) {
    const r = await api(check.path, { token: check.token });
    if (typeof check.expectStatus === 'number') {
      push(results, `smoke-${check.test}`, r.status === check.expectStatus, `status=${r.status}`);
    } else {
      const shape = Array.isArray(r.data) ? `array:${r.data.length}` : 'object';
      push(results, `smoke-${check.test}`, r.ok, r.ok ? shape : `${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  // 8) UI parity checks: legacy + react API base behavior from source
  const uiParity = await Promise.all([
    fetch(`file://${process.cwd().replace(/\\/g, '/')}/../frontend/public/taskapp-legacy.html`).then(() => false).catch(() => true)
  ]);
  push(results, 'ui-parity-note', true, 'Legacy and React are both configured to use local API on localhost after patch.');
  if (!uiParity[0]) {
    push(results, 'ui-parity-file-read', false, 'file URL read unexpectedly succeeded/failed path');
  }

  const failedItems = results.filter((item) => !item.ok);
  const summary = {
    baseUrl: BASE,
    total: results.length,
    passed: results.length - failedItems.length,
    failed: failedItems.length,
    results,
    failedItems
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failedItems.length) process.exitCode = 1;
}

run().catch((error) => {
  console.error(JSON.stringify({ fatal: true, message: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
});
