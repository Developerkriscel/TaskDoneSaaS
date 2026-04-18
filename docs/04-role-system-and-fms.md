# Role System and Hybrid FMS

## Roles

### Super Admin
- Full system access
- Can create App Admins/Admins
- Can configure FMS connector sheet ID

### App Admin / Admin
- User operations
- Dashboard, MIS, reports, task lifecycle management

### Employee
- Execution workflows
- Own tasks and submissions

## Enforcement
- JWT auth middleware (`authRequired`)
- Role middleware (`roleRequired`)
- Method-level checks to be added per migrated function

## FMS Hybrid Integration
- Keep FMS in Google Sheets as source of truth.
- Save sheet ID in MongoDB `appsettings` key `fmsSheetId`.
- Backend service reads via Google Sheets API using service account.
- Cache FMS reads short-term to avoid latency spikes.
