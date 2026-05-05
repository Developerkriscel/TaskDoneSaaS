import { asyncHandler } from '../utils/asyncHandler.js';
import { runGasMethod } from '../services/gasCompatService.js';

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const secureCookie = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : isProd;
  const sameSite = process.env.COOKIE_SAMESITE || (secureCookie ? 'none' : 'lax');

  return {
    httpOnly: true,
    sameSite,
    secure: secureCookie,
    path: '/'
  };
}

function isCookieAuthEnabled() {
  return String(process.env.COOKIE_AUTH_ENABLED || 'false').toLowerCase() === 'true';
}

export const login = asyncHandler(async (req, res) => {
  const { userId, password } = req.body;
  const result = await runGasMethod('checkCredentials', [userId, password], { user: req.user || null });

  if (!result.isValid) {
    return res.status(401).json(result);
  }

  if (isCookieAuthEnabled()) {
    res.cookie('td_token', result.token, cookieOptions());
  }
  res.json(result);
});

export const currentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({
    isValid: true,
    userName: user.name,
    role: user.role,
    roleName: user.roleName || user.role,
    isAppAdmin: Boolean(user.isAppAdmin || user.role === 'App Admin'),
    companyId: user.companyId || null,
    loginScope: user.isAppAdmin || user.role === 'App Admin' ? 'platform' : 'company',
    companyFeatures: req.companyFeatures || null
  });
});

export const logout = asyncHandler(async (req, res) => {
  if (isCookieAuthEnabled()) {
    res.clearCookie('td_token', cookieOptions());
  }
  res.json({ success: true });
});
