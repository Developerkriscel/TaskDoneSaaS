import { PlatformAudit } from '../models/PlatformAudit.js';

export async function recordPlatformAudit({
  actor = null,
  action,
  entityType = 'Platform',
  entityId = '',
  targetCompanyId = null,
  targetCompanyName = '',
  status = 'Success',
  details = {}
}) {
  return PlatformAudit.create({
    actorUserId: actor?._id || null,
    actorName: actor?.name || actor?.userId || 'Unknown',
    actorEmail: actor?.email || '',
    action,
    entityType,
    entityId: entityId ? String(entityId) : '',
    targetCompanyId,
    targetCompanyName,
    status,
    details
  });
}