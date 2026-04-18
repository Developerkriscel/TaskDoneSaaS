import { asyncHandler } from '../utils/asyncHandler.js';
import { runGasMethod } from '../services/gasCompatService.js';

export const dashboard = asyncHandler(async (req, res) => {
  const filters = req.query || {};
  const data = await runGasMethod('getDashboardPageData', [req.user.name, req.user.role, filters], { user: req.user });
  res.json(data);
});

export const employeeDashboard = asyncHandler(async (req, res) => {
  const filters = req.query || {};
  const data = await runGasMethod('getEmployeeDashboardPageData', [req.user.name, filters], { user: req.user });
  res.json(data);
});

export const pendingTasks = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getAllPendingTasksForUser', [req.user.name], { user: req.user });
  res.json(data);
});

export const delegatedTasks = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getDelegatedTasksForEmployee', [req.user.name, req.query || {}], { user: req.user });
  res.json(data);
});

export const checklistTasks = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getChecklistTasksForEmployee', [req.user.name, req.query || {}], { user: req.user });
  res.json(data);
});

export const workRequests = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getUserWorkRequests', [req.user.name, req.query || {}], { user: req.user });
  res.json(data);
});

export const createDelegations = asyncHandler(async (req, res) => {
  const data = await runGasMethod('saveTask', [req.body.tasks || [], req.user.name], { user: req.user });
  res.json({ success: data === 'success', message: data });
});

export const createChecklist = asyncHandler(async (req, res) => {
  const data = await runGasMethod('saveChecklistTask', [req.body, req.user.name], { user: req.user });
  res.json({ success: data === 'success', message: data });
});

export const createWorkRequests = asyncHandler(async (req, res) => {
  const payload = Array.isArray(req.body.requests) ? req.body.requests : [req.body];
  const data = await runGasMethod('saveWorkRequest', [payload, req.user.name], { user: req.user });
  res.json({ success: data === 'success', message: data });
});

export const submitTask = asyncHandler(async (req, res) => {
  const { actionType, id, remarks, filesData = [] } = req.body;
  const data = await runGasMethod('submitTaskWrapper', [actionType, id, remarks, filesData], { user: req.user });
  res.json({ success: data === 'success', message: data });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { type, id, status, remarks, planDate } = req.body;
  const data = await runGasMethod('updateStatusWrapper', [type, id, status, remarks, planDate], { user: req.user });
  res.json({ success: data === 'success', message: data });
});

export const approvals = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getTasksForApproval', [req.user.name, req.user.role, req.query || {}], { user: req.user });
  res.json(data);
});

export const reports = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getAllReportData', [req.user.name, req.user.role, req.query || {}], { user: req.user });
  res.json(data);
});

export const kraMaster = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getKraMasterData', [req.user.name, req.user.role, req.query || {}], { user: req.user });
  res.json(data);
});

export const filteredCard = asyncHandler(async (req, res) => {
  const { cardType, status } = req.query;
  const data = await runGasMethod('getFilteredDataForCard', [cardType, status, req.user.name, req.user.role, req.query || {}], { user: req.user });
  res.json(data);
});

export const employeePerformance = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getEmployeePerformanceReport', [req.user.name, req.user.role, req.query || {}], { user: req.user });
  res.json(data);
});

export const fmsTasks = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getFmsTasksForEmployee', [req.user.name, req.user.role, req.query || {}], { user: req.user });
  res.json(data);
});

export const fmsMarkDone = asyncHandler(async (req, res) => {
  const data = await runGasMethod('markFmsTaskDone', [req.body.rowId], { user: req.user });
  res.json({ success: data === 'success', message: data });
});

export const misData = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getMisData', [req.user.name, req.user.role, req.query || {}], { user: req.user });
  res.json(data);
});

export const saveMisScore = asyncHandler(async (req, res) => {
  const { targetEmployee, nextWeekTarget } = req.body;
  const data = await runGasMethod('saveUserWeeklyScore', [targetEmployee, nextWeekTarget, req.user.role], { user: req.user });
  res.json({ success: data === 'success', message: data });
});

export const saveMisSnapshot = asyncHandler(async (req, res) => {
  const data = await runGasMethod('saveMisWeeklySnapshot', [req.user.name, req.user.role], { user: req.user });
  res.json({ success: data === 'success', message: data });
});

export const userSubmissions = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getEmployeeSubmissions', [req.user.name], { user: req.user });
  res.json(data);
});
