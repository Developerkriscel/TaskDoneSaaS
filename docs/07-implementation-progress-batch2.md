# Implementation Progress - Batch 2

## Newly Implemented in Node Logic (real behavior)

### Dashboard and Tasks
- getDashboardPageData
- getEmployeeDashboardPageData
- getDelegatedTasksForEmployee
- getUserWorkRequests
- getChecklistTasksForEmployee
- getAllPendingTasksForUser
- getTasksForApproval
- getFilteredDataForCard
- getKraMasterData
- getEmployeePerformanceReport
- getFmsTasksForEmployee (hybrid placeholder)
- markFmsTaskDone (hybrid placeholder)
- createTasksDaily
- isTaskDueToday
- getExistingTasks
- addTasksToSheet

### Checklist and Status Actions
- markChecklistTaskDone
- markChecklistTasksDoneBulk
- updateStatusWrapper
- submitTaskWrapper

### Create Flows
- saveTask
- saveChecklistTask
- saveWorkRequest

### MIS and Reports (baseline)
- getMisData
- saveUserWeeklyScore
- saveMisWeeklySnapshot
- getAllReportData (baseline shape)

### User Submission Aggregation
- getEmployeeSubmissions

## New REST Endpoints (`/api/v1`)
- `POST /auth/login`
- `GET /dashboard`
- `GET /dashboard/employee`
- `GET /tasks/pending`
- `GET /tasks/delegations`
- `GET /tasks/checklists`
- `GET /tasks/work-requests`
- `POST /tasks/delegations`
- `POST /tasks/checklists`
- `POST /tasks/work-requests`
- `POST /tasks/submit`
- `POST /tasks/status`
- `GET /tasks/submissions`
- `GET /approvals`
- `GET /reports`
- `GET /reports/employee-performance`
- `GET /dashboard/card-filter`
- `GET /kra/master`
- `GET /fms/tasks`
- `POST /fms/done`
- `GET /mis`
- `POST /mis/score`
- `POST /mis/snapshot`
- `GET /admin/projects`
- `POST /admin/projects/manage`
- `GET /admin/users`
- `POST /admin/users`
- `DELETE /admin/users/:userId`
- `GET /admin/hierarchy`
- `POST /admin/hierarchy`
- `POST /admin/fms/connector`

## Supporting Utilities Added
- `utils/dateFilters.js`
- `services/coreTaskService.js`

## Notes
- GAS-compatible RPC method names remain supported through `/api/rpc`.
- Many methods are still mapped but not fully migrated to exact parity yet.
- This batch focused on critical end-user flows and role-protected REST migration.
