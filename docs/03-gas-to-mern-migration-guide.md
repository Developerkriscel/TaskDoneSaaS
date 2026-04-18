# GAS to MERN Migration Guide

## 1. Backend Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and update values.
4. `npm run dev`

## 2. Frontend Setup
1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. `npm run dev`

## 3. Data Migration Steps
1. Export all Google Sheets tabs to CSV.
2. Import `Admin Detail + Employe Detail` into `users` first.
3. Import `Projects` into `projects`.
4. Build user/project lookup dictionaries.
5. Import `Hierarchy Setup` using user ObjectIds.
6. Import `DELEGATED WORK`, `WORK_REQUESTS`, `CHECKLIST TASK` replacing user/project text with ObjectIds.
7. Import `MIS History` using employee ObjectIds.
8. Insert `appsettings` record for FMS sheet connection.

## 4. Logic Porting Strategy
1. Keep RPC names stable with method map to avoid immediate frontend breakage.
2. Move each method from not-migrated to full implementation in service layer.
3. Add dedicated REST routes after parity is validated.

## 5. Trigger Porting
- GAS installable trigger `createTasksDaily` -> Node cron (`0 9 * * *`).
- Spreadsheet onEdit automation -> domain events in update services.

## 6. File Upload Porting
- GAS DriveApp -> Cloudinary (current placeholder ready).

## 7. Email Porting
- GAS MailApp -> Nodemailer SMTP.

## 8. Validation and Parity Checklist
- Login
- Dashboard metrics
- Delegation create/update/approval
- Work request lifecycle
- Checklist automation and completion
- MIS and report outputs
- Role access matrix
