import { asyncHandler } from '../utils/asyncHandler.js';
import { runGasMethod } from '../services/gasCompatService.js';

export const projects = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getProjectsWithStatus', [], { user: req.user });
  res.json(data);
});

export const manageProject = asyncHandler(async (req, res) => {
  const { action, data } = req.body;
  const result = await runGasMethod('manageProject', [action, data], { user: req.user });
  res.json({ success: result === 'success', message: result });
});

export const users = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getUsersForManagement', [], { user: req.user });
  res.json(data);
});

export const upsertUser = asyncHandler(async (req, res) => {
  const result = await runGasMethod('upsertUser', [req.body], { user: req.user });
  res.json({ success: result === 'success', message: result });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const result = await runGasMethod('deleteUser', [req.params.userId], { user: req.user });
  res.json({ success: result === 'success', message: result });
});

export const hierarchyGet = asyncHandler(async (req, res) => {
  const data = await runGasMethod('getHierarchyData', [], { user: req.user });
  res.json(data);
});

export const hierarchySave = asyncHandler(async (req, res) => {
  const result = await runGasMethod('saveHierarchy', [req.body], { user: req.user });
  res.json({ success: result === 'success', message: result });
});

export const saveFmsConnector = asyncHandler(async (req, res) => {
  const connectorPayload = req.body?.sheetId ? { sheetId: req.body.sheetId, range: req.body.range } : req.body;
  const result = await runGasMethod('saveFmsSheetSetting', [connectorPayload], { user: req.user });
  res.json({ success: result === 'success', message: result });
});
