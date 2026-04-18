# Phase 3 API Documentation (Express RPC Compatibility)

Base URL: `/api`

## Health
- `GET /health`

## RPC Compatibility Endpoints
- `GET /api/rpc/methods`
- `POST /api/rpc`
- `POST /api/rpc/secure`

### POST /api/rpc body
```json
{
  "method": "checkCredentials",
  "params": ["userId", "password"]
}
```

### Response
- Mirrors legacy GAS style per method.

## Implemented Methods (currently real)
- `checkCredentials`
- `getProjects`
- `getProjectsWithStatus`
- `getAllUsers`
- `getAdminsAndEmployees`
- `getHierarchyData`
- `saveHierarchy`
- `getUsersForManagement`
- `upsertUser`
- `deleteUser`
- `manageProject`
- `getTeamMembersWithManager`
- `getNotificationCounts` (baseline)
- `getUnifiedAppData` (baseline payload)
- `saveFmsSheetSetting`

## GAS-Compatible Method Registry
- Every GAS function name is registered in backend method map.
- Unfinished methods return:
```json
{
  "success": false,
  "error": "Function 'X' is mapped but not fully migrated yet."
}
```

## Auth
- JWT returned from `checkCredentials`.
- Send `Authorization: Bearer <token>` for secure endpoints.
