# Frontend RPC Mapping (google.script.run -> Express RPC)

Frontend calls identified in legacy UI are mapped to backend RPC method names:

1. checkCredentials
2. getUnifiedAppData
3. getDashboardPageData
4. getEmployeeDashboardPageData
5. getAllPendingTasksForUser
6. getDelegatedTasksForEmployee
7. getChecklistTasksForEmployee
8. getUserWorkRequests
9. getEmployeeSubmissions
10. getTasksForApproval
11. getFilteredDataForCard
12. getAllReportData
13. getEmployeePerformanceReport
14. getKraMasterData
15. getMisData
16. saveMisWeeklySnapshot
17. saveUserWeeklyScore
18. getTeamMembersWithManager
19. getNotificationCounts
20. saveTask
21. saveChecklistTask
22. saveWorkRequest
23. submitTaskWrapper
24. updateStatusWrapper
25. markChecklistTaskDone
26. markChecklistTasksDoneBulk
27. getFmsTasksForEmployee
28. markFmsTaskDone
29. getUsersForManagement
30. upsertUser
31. deleteUser
32. getHierarchyData
33. saveHierarchy
34. getProjectsWithStatus
35. manageProject
36. getAllUsers
37. getAdminsAndEmployees

All names are accepted by `POST /api/rpc` using method dispatch in service map.
