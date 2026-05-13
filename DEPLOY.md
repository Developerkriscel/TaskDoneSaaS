# TaskDoneSaaS - Deployment Guide

## GitHub Repository
**https://github.com/Developerkriscel/TaskDoneSaaS**

---

## Quick Deploy to VPS

### Prerequisites
- VPS with Ubuntu 22.04/24.04
- SSH access to VPS
- Domain configured (optional)
- MongoDB Atlas cluster (or local MongoDB)

---

## Deploy on VPS (SSH Commands)

### Step 1: Initial VPS Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2, Nginx, Certbot
npm install -g pm2
apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Create App Directory

```bash
# Create user and directory
useradd -m -s /bin/bash taskdone
mkdir -p /var/www/taskdone/logs
chown -R taskdone:taskdone /var/www/taskdone
```

### Step 3: Clone from GitHub

```bash
# As taskdone user
su - taskdone

# Clone repository
git clone https://github.com/Developerkriscel/TaskDoneSaaS.git /var/www/taskdone
cd /var/www/taskdone
```

### Step 4: Configure Environment

```bash
cd /var/www/taskdone/backend
nano .env
```

**Add your configuration:**
```env
NODE_ENV=production
PORT=8080
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CORS_ALLOW_ANY_ORIGIN=false
JWT_EXPIRES_IN=1d
BOOTSTRAP_INCLUDE_SUPERADMIN=false
```

### Step 5: Install & Build

```bash
# Backend dependencies
cd /var/www/taskdone/backend
npm install --omit=dev

# Frontend dependencies and build
cd ../frontend
npm install
npm run build
```

### Step 6: Start with PM2

```bash
cd /var/www/taskdone
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u taskdone --hp /home/taskdone
```

### Step 7: Configure Nginx

```bash
sudo cp /var/www/taskdone/deploy/nginx.conf /etc/nginx/sites-available/taskdone
sudo ln -sf /etc/nginx/sites-available/taskdone /etc/nginx/sites-enabled/taskdone
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo systemctl reload nginx
```

### Step 9: Bootstrap Admin

```bash
cd /var/www/taskdone/backend
node src/scripts/bootstrapAdmins.js
```

---

## Docker Deploy (Alternative)

### Dockerfile (Root)

```dockerfile
FROM node:20

WORKDIR /app

# Install PM2
RUN npm install -g pm2

# Copy app (exclude node_modules)
COPY . .
RUN cd backend && npm install --omit=dev
RUN cd frontend && npm install && npm run build

EXPOSE 8080

CMD ["pm2-runtime", "start", "deploy/ecosystem.config.js"]
```

### Build & Run

```bash
docker build -t taskdone .
docker run -d -p 8080:8080 --name taskdone taskdone
```

---

## Docker Compose (Full Stack)

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./logs:/app/logs

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/conf.d/default.conf
      - ./frontend/dist:/var/www/taskdone/frontend/dist
      - ./ssl:/etc/letsencrypt/live/yourdomain.com
    depends_on:
      - app
```

### Run

```bash
docker-compose up -d
```

---

## Update Deployment

```bash
# SSH to VPS
su - taskdone
cd /var/www/taskdone

# Pull latest code
git pull

# Rebuild
cd frontend && npm install && npm run build
cd ../backend && npm install --omit=dev

# Restart
pm2 restart taskdone-backend
```

---

## Default Admin Credentials

| Role | User ID | Password |
|------|---------|----------|
| App Admin | `appadmin` | `AppAdmin@123` |
| Super Admin | `superadmin` | `SuperAdmin@123` |

---

## Useful Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs taskdone-backend

# Restart
pm2 restart taskdone-backend

# SSL renewal
sudo certbot renew --dry-run
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | JWT signing secret |
| PORT | No | Server port (default: 8080) |
| CORS_ALLOWED_ORIGINS | No | Allowed frontend domains |
| REDIS_URL | No | Redis cache connection |
| MISTRAL_API_KEY | No | AI chat feature |

---

## Support

For issues, check:
1. `pm2 logs taskdone-backend`
2. `sudo tail /var/log/nginx/error.log`
3. MongoDB connectivity
