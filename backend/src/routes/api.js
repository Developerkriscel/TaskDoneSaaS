import { Router } from 'express';
import { rpcCall, rpcMethods } from '../controllers/gasCompatController.js';
import { authRequired, roleRequired } from '../middlewares/auth.js';
import {
	approvePlatformPlanRequest,
	changeUserRoleGlobal,
	companyFullDetails,
	createCompany,
	getCompanySubscription,
	platformAuditLogs,
	platformPlanRequests,
	listCompanies,
	listCompanyRoles,
	listCompanyUsers,
	platformOverview,
	platformRenewals,
	platformSubscriptions,
	platformUserCredentials,
	platformUserUpdate,
	rejectPlatformPlanRequest,
	renewalAction,
	resetUserPasswordGlobal,
	toggleUserStatusGlobal,
	updateCompanyStatus,
	updateCompanySubscription,
	upsertCompanyRole,
	deleteCompanyRole
} from '../controllers/platformController.js';

const router = Router();

router.get('/rpc/methods', rpcMethods);
router.post('/rpc', rpcCall);
router.post('/rpc/secure', authRequired, rpcCall);

router.use('/admin', authRequired, roleRequired('App Admin'));
router.get('/admin/overview', platformOverview);
router.get('/admin/renewals', platformRenewals);
router.post('/admin/renewals/action', renewalAction);
router.get('/admin/plan-requests', platformPlanRequests);
router.patch('/admin/plan-requests/:requestId/approve', approvePlatformPlanRequest);
router.patch('/admin/plan-requests/:requestId/reject', rejectPlatformPlanRequest);
router.get('/admin/audits', platformAuditLogs);
router.get('/admin/subscriptions', platformSubscriptions);
router.get('/admin/companies', listCompanies);
router.post('/admin/companies', createCompany);
router.patch('/admin/companies/status', updateCompanyStatus);
router.get('/admin/companies/:companyId/details', companyFullDetails);
router.get('/admin/companies/:companyId/users', listCompanyUsers);
router.get('/admin/companies/:companyId/roles', listCompanyRoles);
router.post('/admin/roles', upsertCompanyRole);
router.delete('/admin/roles/:roleId', deleteCompanyRole);
router.get('/admin/companies/:companyId/subscription', getCompanySubscription);
router.post('/admin/subscriptions', updateCompanySubscription);
router.get('/admin/users/:userId/credentials', platformUserCredentials);
router.patch('/admin/users/:userId', platformUserUpdate);
router.patch('/admin/users/reset-password', resetUserPasswordGlobal);
router.patch('/admin/users/role', changeUserRoleGlobal);
router.patch('/admin/users/toggle-status', toggleUserStatusGlobal);

export default router;
