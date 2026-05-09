# MongoDB URI Migration (Admin-Safe, Detailed Flow)

This flow migrates TaskDone from old MongoDB URI to a new URI with zero admin lockout risk.

## Scope

1. Move complete DB data from old URI to new URI.
2. Ensure `App Admin` access remains intact.
3. Provide environment-variable based App Admin ID/password change option.
4. Provide rollback path.

## Prerequisites

1. Current production `.env` backup available.
2. Old and new MongoDB URIs ready.
3. MongoDB Database Tools installed (`mongodump`, `mongorestore`) on VPS/local admin machine.
4. Backend code updated with scripts:
   - `npm run bootstrap:admins`
   - `npm run rotate:app-admin`

## Phase 1: Pre-migration backup

1. Freeze deployment window (no schema/task writes during migration).
2. Keep current backend running until dump is complete.
3. Create dump from old URI:

```powershell
mongodump --uri="<OLD_MONGODB_URI>" --out="./mongo-backup-pre-migration"
```

4. Optional integrity snapshot:
   - Save user counts and key collection counts from old DB.

## Phase 2: Restore to new URI

1. Restore backup to new URI:

```powershell
mongorestore --uri="<NEW_MONGODB_URI>" --drop "./mongo-backup-pre-migration"
```

2. Verify critical collections exist in new DB:
   - `users`
   - `companies`
   - `roles`
   - `delegationtasks`
   - `checklisttasks`
   - `workrequests`
   - `appsettings`

## Phase 3: Switch application URI

1. Update backend `.env`:
   - `MONGODB_URI=<NEW_MONGODB_URI>`
2. Keep old URI saved separately for rollback.
3. Restart backend (PM2 example):

```powershell
pm2 restart taskdone-backend
```

## Phase 4: Admin safety checks (mandatory)

### 4.1 Bootstrap App Admin (idempotent)

This ensures App Admin exists in the new DB without touching company-level roles.

```powershell
cd backend
npm run bootstrap:admins
```

Default behavior:
1. Only `App Admin` is created/updated from env.
2. `Super Admin` is not modified unless `BOOTSTRAP_INCLUDE_SUPERADMIN=true`.
3. Company users (`Super Admin/Admin/Employee`) remain DB-driven.

Primary env keys used:
1. `BOOTSTRAP_APPADMIN_USERID`
2. `BOOTSTRAP_APPADMIN_PASSWORD`
3. `BOOTSTRAP_APPADMIN_EMAIL`

### 4.2 Change App Admin ID/password via env (optional)

If App Admin credentials need rotation immediately after migration:

1. Set these vars in `backend/.env`:
   - `APPADMIN_PREVIOUS_USERID` (old userId, optional)
   - `APPADMIN_TARGET_USERID`
   - `APPADMIN_TARGET_PASSWORD`
   - `APPADMIN_TARGET_EMAIL`
   - `APPADMIN_TARGET_NAME`
   - `APPADMIN_TARGET_NUMBER`

2. Run:

```powershell
cd backend
npm run rotate:app-admin
```

Behavior:
1. Tries target userId first.
2. If not found, tries previous userId.
3. If still not found, updates first `App Admin` user.
4. If no App Admin exists, creates one.
5. Ensures role remains `App Admin` and status `Active`.

## Phase 5: Post-switch validation checklist

1. `/health` endpoint is `success: true`.
2. Login works for:
   - App Admin
   - One company Super Admin
3. Dashboard loads with real data.
4. Create delegation/checklist/work request and verify persistence.
5. Trigger status update and verify notification mail.
6. Verify platform pages:
   - companies
   - subscriptions
   - users
   - notification settings

## Phase 6: Rollback plan (if any critical issue)

1. Put old URI back in `.env`.
2. Restart backend:

```powershell
pm2 restart taskdone-backend
```

3. Re-run smoke checks for admin login and dashboard.

## Security recommendations

1. Never commit `.env` to git.
2. Use long random secrets for admin passwords during migration, then rotate.
3. Restrict DB users:
   - app runtime user (read/write app db only)
   - backup/migration user (temporary elevated access)
4. Remove old URI credentials after successful cutover.

## Quick command sequence

```powershell
# 1) Backup old DB
mongodump --uri="<OLD_MONGODB_URI>" --out="./mongo-backup-pre-migration"

# 2) Restore to new DB
mongorestore --uri="<NEW_MONGODB_URI>" --drop "./mongo-backup-pre-migration"

# 3) Switch app URI in backend/.env (MONGODB_URI=<NEW_MONGODB_URI>)

# 4) Restart backend
pm2 restart taskdone-backend

# 5) Ensure admins exist
cd backend
npm run bootstrap:admins

# 6) Optional app admin credential rotate
npm run rotate:app-admin
```
