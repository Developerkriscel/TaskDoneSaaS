import cron from 'node-cron';
import { runGasMethod } from '../services/gasCompatService.js';

export function registerCronJobs() {
  cron.schedule('0 0 * * *', async () => {
    try {
      await runGasMethod('createTasksDaily', []);
      console.log('[cron] createTasksDaily executed at 00:00 Asia/Kolkata');
    } catch (error) {
      console.error('[cron] createTasksDaily failed', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
}
