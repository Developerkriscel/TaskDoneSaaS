# TaskDone SaaS: Hostinger VPS Launch Checklist

## 1) Server baseline

1. Ubuntu LTS VPS use karo (2 vCPU, 4 GB RAM minimum).
2. DNS A records point karo:
   - `app.yourdomain.com` -> VPS IP
   - `api.yourdomain.com` -> VPS IP (optional if same domain + `/api` proxy)
3. Install essentials:
   - `sudo apt update && sudo apt upgrade -y`
   - `sudo apt install -y nginx git ufw`
   - Node.js 20 LTS
   - `npm i -g pm2`

## 2) App setup

1. Repo clone:
   - `git clone <repo-url> && cd TaskDoneSaaS`
2. Install deps:
   - `cd backend && npm ci`
   - `cd ../frontend && npm ci && npm run build`
3. Env create:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env`
4. `backend/.env` me required values set karo:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CORS_ALLOWED_ORIGINS`
   - cookie settings for HTTPS (`COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` when cross-site)

## 3) MongoDB + Redis

1. MongoDB Atlas recommended:
   - Network access me VPS IP allow karo.
   - DB user least-privilege rakho.
2. Redis:
   - Strongly recommended for production performance.
   - Agar Redis unavailable hai, app memory cache pe fallback karti hai (service down nahi hota, but cache efficiency kam hoti hai).
3. Redis local install (optional):
   - `sudo apt install -y redis-server`
   - `sudo systemctl enable redis-server`
   - `sudo systemctl start redis-server`
   - `REDIS_URL=redis://127.0.0.1:6379`

## 4) Process manager (PM2)

1. Backend run:
   - `cd backend`
   - `pm2 start src/server.js --name taskdone-backend`
2. PM2 startup:
   - `pm2 save`
   - `pm2 startup`

## 5) Nginx reverse proxy

Use single domain setup (recommended) so frontend + backend same origin pe chale:

- Frontend static build serve from Nginx
- `/api` route -> backend `127.0.0.1:8080`

Example Nginx server block:

```nginx
server {
  server_name app.yourdomain.com;

  root /var/www/taskdone/frontend/dist;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8080/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 6) SSL + firewall

1. TLS:
   - `sudo apt install -y certbot python3-certbot-nginx`
   - `sudo certbot --nginx -d app.yourdomain.com`
2. Firewall:
   - `sudo ufw allow OpenSSH`
   - `sudo ufw allow 'Nginx Full'`
   - `sudo ufw enable`

## 7) Launch validation (must-pass)

1. Health:
   - `curl https://app.yourdomain.com/health` (if proxied) or direct backend host.
2. Login + dashboard load test.
3. Role-based flows:
   - admin actions
   - task create/update
   - approval flow
4. Attachments upload (Cloudinary configured ho to).
5. Email test from admin notification settings.
6. FMS integration test (if used).

## 8) Operations hardening

1. Daily DB backup policy ensure karo (Atlas snapshots).
2. PM2 logs rotation setup:
   - `pm2 install pm2-logrotate`
3. Monitoring:
   - uptime monitor on `/health`
   - disk and memory alerts
4. Release procedure:
   - pull latest
   - `npm ci`
   - frontend build
   - `pm2 restart taskdone-backend`
   - smoke test checklist run

## 9) Common failure points

1. CORS blocked:
   - `CORS_ALLOWED_ORIGINS` exact domain list me ho.
2. Cookie auth not persisting:
   - HTTPS mandatory with `COOKIE_SECURE=true`.
   - cross-site case me `COOKIE_SAMESITE=none`.
3. Mongo timeout:
   - Atlas IP allowlist and network route verify.
4. Redis down:
   - app runs with in-memory cache fallback, but latency/cache misses badh sakte hain.
5. Frontend hitting old API:
   - `VITE_API_BASE_URL` verify, then rebuild frontend.
