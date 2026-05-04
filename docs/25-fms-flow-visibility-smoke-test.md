# FMS Flow Visibility Smoke Test

Date: May 1, 2026  
Scope: Verify `Live/Current` view toggle and employee progress masking in FMS flow APIs/UI.

## Preconditions

1. Three active users exist in same company:
- `Super Admin`
- `Admin`
- `Employee`
2. At least one active flow exists with multiple steps (3+ preferred).
3. Employee should be assigned on an early step, and later steps should exist after that.

## Quick UI Smoke (Primary)

1. Login as `Super Admin` or `Admin`.
2. Open FMS Flow panel and select active flow.
3. Confirm `Flow View` toggle appears with:
- `Live`
- `Current Progress`
4. Switch to `Live`.
- Expected: Full visible flow timeline according to role access.
5. Switch to `Current Progress`.
- Expected: Only steps/events up to current progress point shown.
6. Keep panel open for at least 10-15 seconds.
- Expected: Data auto-refreshes (live polling) without manual reload.

7. Login as `Employee`.
8. Open same flow.
- Expected: `Flow View` toggle should not appear.
- Expected: Employee should only see progress up to their allowed/current point.
- Expected: Future steps beyond allowed scope must not be shown.

## API Smoke (Security Validation)

Use any API client (Postman/curl). Reuse authenticated cookie/token per role.

### Endpoints

- `GET /api/v1/fms/flows/:flowId?viewMode=live`
- `GET /api/v1/fms/flows/:flowId?viewMode=current`
- `GET /api/v1/fms/flows/:flowId/monitor?viewMode=live`
- `GET /api/v1/fms/flows/:flowId/monitor?viewMode=current`

### Expected by role

1. `Super Admin`
- Access allowed.
- `live` returns full allowed company flow view.
- `current` returns truncated at current progress.

2. `Admin`
- Access allowed only for flows created by admin or assigned within visible hierarchy scope.
- `live/current` behavior same as above (with scope limits).

3. `Employee`
- Access allowed only for visible assigned flows.
- Returned `steps` and `events` must be masked so future progress is not exposed.
- If out-of-scope flow id is requested, expect `403`.

## Pass/Fail Checklist

1. Admin/Super Admin toggle visible in UI.
2. Employee toggle hidden in UI.
3. Employee cannot see future steps/events.
4. Unauthorized flow detail access returns `403`.
5. Monitor + detail payloads reflect same masking rules.
6. Live refresh works (poll-based updates visible).

## Notes

- `viewMode` defaults to `live` when omitted.
- Employee masking is enforced in backend response, not only frontend rendering.
