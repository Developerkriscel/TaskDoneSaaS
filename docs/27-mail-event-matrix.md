# TaskDone Mail Event Matrix (LLM-Formatted)

This document defines when an email is triggered, who receives it, and what the email communicates.

## Global behavior

1. All workflow emails use `composeProfessionalEmailTemplate(...)`.
2. Tone is formal, operational, and emoji-free.
3. If LLM generation is unavailable, a professional fallback template is used.
4. Email send failure does not block task/workflow persistence.

## Event matrix

| Event | Trigger Location | Recipient | Category | Action | Typical Subject |
|---|---|---|---|---|---|
| Delegation assigned | `saveTask` | Delegated user (`delegatedToUser`) | Delegation | New Task Assigned | `[TaskDone] New Delegation Task Assigned` |
| Checklist assigned | `saveChecklistTask` | Checklist assignee (`user`) | Checklist | Checklist Task Assigned | `[TaskDone] New Checklist Task Assigned` |
| Work request assigned | `saveWorkRequest` | Request target (`requestForUser`) | Work Request | New Work Request Assigned | `[TaskDone] New Work Request Assigned` |
| Delegation submitted for approval | `submitTaskWrapper` (`Task`) | Delegator/approver (`delegatedByUser`) | Delegation | Submitted For Approval | `[TaskDone] Delegation Submitted For Approval` |
| Work request submitted for approval | `submitTaskWrapper` (`Work Request`) | Request creator (`requestedByUser`) | Work Request | Submitted For Approval | `[TaskDone] Work Request Submitted For Approval` |
| Delegation completed | `updateStatusWrapper` (`delegation`) | Delegator/approver (`delegatedByUser`) | Delegation | Task Completed | `[TaskDone] Delegation Completed` |
| Delegation rework | `updateStatusWrapper` (`delegation`) | Delegator/approver (`delegatedByUser`) | Delegation | Task Rework Requested | `[TaskDone] Delegation Rework` |
| Work request completed | `updateStatusWrapper` (`workrequest`) | Request creator (`requestedByUser`) | Work Request | Request Completed | `[TaskDone] Work Request Completed` |
| Work request rework | `updateStatusWrapper` (`workrequest`) | Request creator (`requestedByUser`) | Work Request | Request Rework Requested | `[TaskDone] Work Request Rework` |
| Checklist completed | `updateStatusWrapper` (`checklist`) | Checklist creator (`delegatedByUser`) | Checklist | Checklist Completed | `[TaskDone] Checklist Completed` |
| Checklist rework | `updateStatusWrapper` (`checklist`) | Checklist creator (`delegatedByUser`) | Checklist | Checklist Rework Requested | `[TaskDone] Checklist Rework` |
| Notification test mail | `sendNotificationTestEmailByCompanyId` | Requested `to` email | System | Notification Configuration Test | `[TaskDone] TaskDone Notification Test Mail` |

## Payload fields included in emails

Common fields used across events:

1. `Project`
2. `Assignee` (where applicable)
3. `Priority` (delegation)
4. `DueDate` or `Deadline`
5. `PlanDate` / `Frequency` (checklist)
6. `Status`
7. `Remarks` (submit/rework/approval flows)
8. `Task` description

## Operational notes

1. SMTP configuration is loaded from company notification settings (`AppSetting`) with env fallback.
2. Notification toggles (`assignment`, `submission`, `approval`, `rework`) remain respected in compatibility email helpers.
3. For production, set `MISTRAL_API_KEY` and keep SMTP sender identity verified.
