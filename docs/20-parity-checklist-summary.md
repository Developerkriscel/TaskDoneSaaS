# End-to-End Parity Checklist (Current State)

## Legend
- Done: implemented and wired in current MERN migration
- Baseline: implemented with working behavior, but may still differ in UI polish or edge-case semantics
- Pending: known gap remains

## Backend compatibility
- RPC method map coverage: Done
- Previously pending compatibility methods: Done (baseline implementations added)
- Hybrid FMS connector methods: Done (baseline)
- Email and attachment service paths: Done (baseline)

## Auth and session
- Login via legacy method name (`checkCredentials`): Done
- JWT issuance and client propagation: Done

## Core task operations
- Delegation create/list/submit: Done
- Checklist master create/list/mark done: Done
- Work Request create/list/submit: Done
- Approval status updates (Completed/Rework): Done

## Dashboard and analytics
- Unified dashboard loading: Done
- Notification counters: Done (baseline)
- MIS views and weekly snapshot action: Done (baseline)
- Reports tabs with data + CSV export: Done (baseline)

## Admin management
- Users CRUD panel: Done (baseline)
- Hierarchy mapping panel: Done (baseline)
- Project management panel: Done (baseline)
- FMS settings panel: Done (baseline)

## UI/UX parity status
- Legacy validation messages in key forms: Done (baseline)
- Approval actions using modal (no browser prompts): Done
- Work action dialogs using modal: Done
- Users/Approvals/Work Request table fidelity pass: Done (baseline)
- Delegation/Checklist table fidelity pass: Done (baseline)

## Remaining fidelity gaps (target for next pass)
- Icon-level visual parity for action controls and badges: Pending
- Exact toast/modal wording timing parity across all flows: Pending
- Full per-view column width/order alignment for every report table: Pending
- Legacy attachment upload UI parity (multi-file preview interactions): Pending
- Exact Select2-like behavior and keyboard interactions on all dropdowns: Pending

## Recommended next pass
- Final UI-polish pass that focuses only on visual/detail parity:
  - action icons and tooltips
  - toast/modal animation/microcopy timing
  - per-table column sizing and wrapping rules
  - attachment preview interactions
