import jwt from 'jsonwebtoken';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';

const DEFAULT_COMPANY_FEATURES = {
  dashboard: true,
  checklists: true,
  delegation: true,
  workRequest: true,
  fmsSystem: true,
  trackStatus: true,
  mis: true,
  reports: true
};

function normalizeEnabledFeatures(enabledFeatures = {}) {
  const source = enabledFeatures && typeof enabledFeatures === 'object' ? enabledFeatures : {};
  return {
    dashboard: source.dashboard !== false,
    checklists: source.checklists !== false,
    delegation: source.delegation !== false,
    workRequest: source.workRequest !== false,
    fmsSystem: source.fmsSystem !== false,
    trackStatus: source.trackStatus !== false,
    mis: source.mis !== false,
    reports: source.reports !== false
  };
}

function readCookieToken(req) {
  const cookieHeader = req.headers.cookie || '';
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';').map((x) => x.trim());
  for (const part of parts) {
    if (!part.startsWith('td_token=')) continue;
    return decodeURIComponent(part.slice('td_token='.length));
  }
  return null;
}

function isCookieAuthEnabled() {
  return String(process.env.COOKIE_AUTH_ENABLED || 'false').toLowerCase() === 'true';
}

const DEFAULT_PERMISSIONS = {
  'Super Admin': {
    canViewAllTasks: true,
    canCreateTasks: true,
    canApproveTasks: true,
    canViewMIS: true
  },
  Admin: {
    canViewAllTasks: false,
    canCreateTasks: true,
    canApproveTasks: true,
    canViewMIS: true
  },
  Employee: {
    canViewAllTasks: false,
    canCreateTasks: false,
    canApproveTasks: false,
    canViewMIS: false
  },
  'App Admin': {
    canViewAllTasks: false,
    canCreateTasks: false,
    canApproveTasks: false,
    canViewMIS: false
  }
};

export async function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const bearerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const cookieToken = isCookieAuthEnabled() ? readCookieToken(req) : null;
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();

    if (!user || user.status !== 'Active') {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    if (!user.isAppAdmin && user.role !== 'App Admin' && user.companyId) {
      const company = await Company.findById(user.companyId).select('status planExpiryDate graceUntil enabledFeatures').lean();
      if (!company) {
        return res.status(403).json({ success: false, error: 'Company access not found' });
      }
      const now = new Date();
      const graceUntil = company.graceUntil ? new Date(company.graceUntil) : null;
      const expiry = company.planExpiryDate ? new Date(company.planExpiryDate) : null;
      const expired = expiry && expiry < now && (!graceUntil || graceUntil < now);
      if (company.status === 'Frozen' || expired) {
        return res.status(403).json({ success: false, error: 'Subscription validation failed for this tenant' });
      }
      req.companyFeatures = normalizeEnabledFeatures(company.enabledFeatures || DEFAULT_COMPANY_FEATURES);
    }

    if (!req.companyFeatures) {
      req.companyFeatures = { ...DEFAULT_COMPANY_FEATURES };
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

export function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

export function permissionRequired(permissionKey) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.user.isAppAdmin || req.user.role === 'App Admin') {
      return res.status(403).json({ success: false, error: 'App Admin cannot access company workflow endpoints' });
    }

    if (req.user.role === 'Super Admin') {
      return next();
    }

    try {
      let permissions = DEFAULT_PERMISSIONS[req.user.role] || DEFAULT_PERMISSIONS.Employee;

      if (req.user.companyId && req.user.roleName) {
        const roleDoc = await Role.findOne({ companyId: req.user.companyId, roleName: req.user.roleName }).lean();
        if (roleDoc?.permissions) {
          permissions = { ...permissions, ...roleDoc.permissions };
        }
      }

      if (!permissions[permissionKey]) {
        return res.status(403).json({ success: false, error: `Missing permission: ${permissionKey}` });
      }

      req.userPermissions = permissions;
      next();
    } catch {
      return res.status(500).json({ success: false, error: 'Permission check failed' });
    }
  };
}

export function featureRequired(featureKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.user.isAppAdmin || req.user.role === 'App Admin') {
      return next();
    }

    const features = req.companyFeatures || DEFAULT_COMPANY_FEATURES;
    if (features[featureKey] === false) {
      return res.status(403).json({ success: false, error: 'disabled please contact TaskEasy Support' });
    }

    next();
  };
}
