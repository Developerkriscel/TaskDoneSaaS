import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { validateEnv } from './config/env.js';
import { registerCronJobs } from './jobs/cronJobs.js';

const PORT = Number(process.env.PORT || 8080);

async function isExistingBackendHealthy(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    if (!response.ok) return false;
    const body = await response.json();
    return body?.success === true;
  } catch {
    return false;
  }
}

async function bootstrap() {
  validateEnv();

  const healthy = await isExistingBackendHealthy(PORT);
  if (healthy) {
    console.log(`Backend already running on port ${PORT}.`);
    return;
  }

  await connectDb(process.env.MONGODB_URI);

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`Server listening on :${PORT}`);
    registerCronJobs();
  });
  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or set a different PORT in .env.`);
      process.exit(1);
    }
    throw error;
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
