# TaskDoneSaaS - Hostinger VPS Deployment Guide

## Overview

This guide covers deploying TaskDoneSaaS on a Hostinger VPS (Ubuntu 22.04).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     USER                                │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTPS (443)
                  ▼
┌─────────────────────────────────────────────────────────┐
│                    NGINX                                 │
│  ┌─────────────────┐    ┌──────────────────────────┐  │
│  │   /api/*        │ -> │  127.0.0.1:8080 (Node)   │  │
│  │   (reverse proxy)│    │  (Backend API)           │  │
│  └─────────────────┘    └──────────────────────────┘  │
│  ┌─────────────────┐                                   │
│  │   /*            │ -> Frontend Static Files (dist/)  │
│  │   (SPA routing) │                                   │
│  └─────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │    MongoDB      │
         │   (Atlas/Local) │
         └─────────────────┘
```

## Prerequisites

- Hostinger VPS with Ubuntu 22.04
- SSH access to your VPS
- Domain name pointed to your VPS IP (optional but recommended)
- Git installed on VPS: `apt install git`

## Quick Deployment

### Step 1: Upload Files to VPS

```bash
# On your LOCAL machine, clone the repo and upload to VPS
git clone https://github.com/yourusername/TaskDoneSaaS.git
cd TaskDoneSaaS
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='dist' . user@your-vps-ip:/var/www/taskdone/
```

Or use SCP:
```bash
scp -r TaskDoneSaaS user@your-vps-ip:/var/www/taskdone/
```

### Step 2: Run the Deployment Script

SSH into your VPS and run:
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to the app directory
cd /var/www/taskdone

# Make the deployment script executable
chmod +x deploy/deploy-vps.sh

# Run the deployment script
sudo ./deploy/deploy-vps.sh --domain yourdomain.com
```

### Step 3: Configure Environment Variables

The script will prompt for:
- **MONGODB_URI**: Your MongoDB connection string
- **JWT_SECRET**: A random secret key (auto-generated if left blank)

Get a free MongoDB Atlas cluster at: https://www.mongodb.com/atlas

### Step 4: Bootstrap Initial Admin Accounts

After deployment, create your admin accounts:
```bash
cd /var/www/taskdone/backend

# Create App Admin
sudo -u taskdone node src/scripts/bootstrapAdmins.js

# Check logs
sudo -u taskdone pm2 logs
```

## Manual Deployment (Alternative)

### 1. Install Dependencies

```bash
# SSH into VPS
ssh user@your-vps-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt-get install -y nginx

# Verify installations
node -v  # Should show v20.x.x
pm2 -v
nginx -v
```

### 2. Create App User and Directory

```bash
sudo useradd -m -s /bin/bash taskdone
sudo mkdir -p /var/www/taskdone
sudo chown -R taskdone:taskdone /var/www/taskdone
```

### 3. Copy Files

```bash
# From your local machine
scp -r TaskDoneSaaS/* user@your-vps-ip:/var/www/taskdone/

# On VPS, set permissions
sudo chown -R taskdone:taskdone /var/www/taskdone
```

### 4. Install Backend Dependencies

```bash
cd /var/www/taskdone/backend
npm install --omit=dev
```

### 5. Create .env File

```bash
sudo nano /var/www/taskdone/backend/.env
```

Example content:
```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskdone
JWT_SECRET=your-long-random-secret-here
JWT_EXPIRES_IN=1d
COOKIE_AUTH_ENABLED=false
COOKIE_SECURE=true
COOKIE_SAMESITE=none
CORS_ALLOW_ANY_ORIGIN=false
CORS_ALLOWED_ORIGINS=https://yourdomain.com
BOOTSTRAP_INCLUDE_SUPERADMIN=false
```

### 6. Build Frontend

```bash
cd /var/www/taskdone/frontend
npm install
npm run build
```

### 7. Configure PM2

```bash
cd /var/www/taskdone
sudo -u taskdone pm2 start deploy/ecosystem.config.js
sudo -u taskdone pm2 save
sudo -u taskdone pm2 startup systemd -u taskdone --hp /home/taskdone
```

### 8. Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/taskdone
```

Copy and edit this config (replace YOUR_DOMAIN with your domain):
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN_OR_IP;

    ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;

    root /var/www/taskdone/frontend/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/taskdone /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Setup SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

### 10. Firewall Setup

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 11. Bootstrap Admin Accounts

```bash
cd /var/www/taskdone/backend
sudo -u taskdone node src/scripts/bootstrapAdmins.js
```

## Post-Deployment

### Check Status

```bash
# Backend status
sudo -u taskdone pm2 status

# Backend logs
sudo -u taskdone pm2 logs

# Nginx status
sudo systemctl status nginx
```

### Access the App

- **App Admin Login**: `https://yourdomain.com/platform-login`
- **User Login**: `https://yourdomain.com/login`
- **Health Check**: `https://yourdomain.com/health`

### Common Commands

```bash
# Restart backend
sudo -u taskdone pm2 restart taskdone-backend

# View logs
sudo -u taskdone pm2 logs --lines 100

# Update app (after pulling new code)
cd /var/www/taskdone
git pull
cd frontend && npm install && npm run build
cd ../backend && npm install --omit=dev
sudo -u taskdone pm2 restart taskdone-backend

# Monitor resources
sudo -u taskdone pm2 monit

# SSL renewal check
sudo certbot renew --dry-run
```

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
sudo -u taskdone pm2 logs

# Common issues:
# 1. MongoDB not accessible - check MONGODB_URI in .env
# 2. Port already in use - change PORT in .env
# 3. Missing environment variables - run validateEnv()
```

### API Returns 503

```bash
# Backend might not be running
sudo -u taskdone pm2 restart taskdone-backend
```

### SSL Certificate Issues

```bash
# Check certbot logs
sudo certbot certificates
sudo certbot renew --force-renewal
```

### Nginx Errors

```bash
# Check nginx config
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | Secret for JWT signing |
| PORT | No | Backend port (default: 8080) |
| NODE_ENV | No | Environment (production/development) |
| CORS_ALLOWED_ORIGINS | No | Allowed frontend origins |
| REDIS_URL | No | Redis cache connection |
| MISTRAL_API_KEY | No | For AI chat feature |
| CLOUDINARY_* | No | For file attachments |

## Features Available

- User Authentication
- Task Delegation
- Checklist Management
- Work Requests
- Approval Workflows
- MIS Reports
- FMS System
- AI Chat Assistant
- Platform Management (multi-tenant)

## Support

For issues, check:
1. PM2 logs: `sudo -u taskdone pm2 logs`
2. Nginx logs: `sudo tail /var/log/nginx/error.log`
3. MongoDB connectivity from VPS
