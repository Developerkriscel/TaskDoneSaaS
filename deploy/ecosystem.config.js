// ============================================================
// PM2 Ecosystem Configuration for TaskDoneSaaS Backend
// ============================================================
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 save                    # Save current process list
//   pm2 startup                 # Setup auto-start on reboot
// ============================================================

export default {
  apps: [
    {
      name: 'taskdone-backend',
      script: 'src/server.js',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
