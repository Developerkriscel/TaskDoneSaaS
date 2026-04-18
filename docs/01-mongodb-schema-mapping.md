# Phase 2 - Google Sheets to MongoDB Atlas Mapping

## Collections

### 1. users (Admin Detail + Employe Detail)
- Model: `User`
- Key fields:
  - `name: String`
  - `number: String`
  - `userId: String (unique)`
  - `email: String (unique)`
  - `passwordHash: String`
  - `role: Enum(Super Admin, Admin, App Admin, Employee)`
  - `status: Enum(Active, Inactive)`
- Indexes:
  - `{ userId: 1 } unique`
  - `{ email: 1 } unique`
  - `{ role: 1, status: 1 }`

### 2. projects (Projects)
- Model: `Project`
- Fields:
  - `name: String (unique)`
  - `status: Enum(Active, Paused)`
  - `createdBy: ObjectId(User)`
- Indexes:
  - `{ name: 1 } unique`
  - `{ status: 1 }`

### 3. hierarchygroups (Hierarchy Setup)
- Model: `HierarchyGroup`
- Fields:
  - `adminUser: ObjectId(User)`
  - `employeeUsers: ObjectId(User)[]`
- Indexes:
  - `{ adminUser: 1 } unique`

### 4. delegationtasks (DELEGATED WORK)
- Model: `DelegationTask`
- Fields map:
  - `legacyTaskId`
  - `delegatedByUser -> User._id`
  - `delegatedToUser -> User._id`
  - `description`
  - `project -> Project._id`
  - `targetDate`
  - `status`
  - `approvalDate`
  - `totalDelays`
  - `onTimeStatus`
  - `priority`
  - `attachmentUrls`, `attachmentByDoer`
- Indexes:
  - `{ delegatedToUser: 1, status: 1, targetDate: 1 }`
  - `{ delegatedByUser: 1, status: 1 }`

### 5. workrequests (WORK_REQUESTS)
- Model: `WorkRequest`
- Fields map:
  - `legacyRequestId`
  - `requestedByUser -> User._id`
  - `requestForUser -> User._id`
  - `description`
  - `project -> Project._id`
  - `deadline`
  - `status`
  - `completionDate`
  - `delayDays`, `onTimeStatus`
  - `attachmentUrls`, `attachmentByDoer`
- Indexes:
  - `{ requestForUser: 1, status: 1, deadline: 1 }`
  - `{ requestedByUser: 1, status: 1 }`

### 6. checklisttasks (CHECKLIST TASK)
- Model: `ChecklistTask`
- Fields map:
  - `legacyTaskId`
  - `user -> User._id`
  - `delegatedByUser -> User._id`
  - `description`
  - `frequency`
  - `project -> Project._id`
  - `planDate`, `actualDate`
  - `remarks`
  - `attachmentRequired`
  - `totalDelay`
  - `onTimeStatus`
  - `approvalStatus`
- Indexes:
  - `{ user: 1, planDate: 1, description: 1 }`
  - `{ approvalStatus: 1, planDate: 1 }`

### 7. mishistories (MIS History)
- Model: `MisHistory`
- Fields:
  - `timestamp`
  - `weekId`
  - `employeeUser -> User._id`
  - `category`
  - `kpiName`
  - `score`
  - `totalTasks, done, pending, delayed, onTime`
  - `nextWeekTarget`
- Indexes:
  - `{ employeeUser: 1, weekId: 1, category: 1 }`

### 8. appsettings (Settings + FMS connector)
- Model: `AppSetting`
- Fields:
  - `key` (unique)
  - `value` (Mixed)
  - `updatedBy -> User._id`
- Use:
  - Store `fmsSheetId`
  - Store other app-level settings

## FMS Hybrid Rule
- FMS data remains in Google Sheets.
- Only connector metadata is stored in MongoDB (`appsettings` key=`fmsSheetId`).
- Node backend fetches FMS from Google Sheets API at runtime.

## ObjectId Replacement Plan
- All sheet composite keys are replaced by ObjectId references:
  - user names -> `User._id`
  - project names -> `Project._id`
- Keep legacy IDs (`legacyTaskId`, `legacyRequestId`) for backward-compatible search and migration rollback.
