import cron from 'node-cron';
import { runGasMethod } from '../services/gasCompatService.js';

export function registerCronJobs() {
  cron.schedule('0 9 * * *', async () => {
    try {
      await runGasMethod('createTasksDaily', []);
      console.log('[cron] createTasksDaily executed');
    } catch (error) {
      console.error('[cron] createTasksDaily failed', error.message);
    }
  });
}
