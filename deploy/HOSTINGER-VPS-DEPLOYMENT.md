# TaskDoneSaaS Deployment Guide for taskeasyapp.in
## Hostinger VPS Complete Setup

---

## Prerequisites

Before starting, make sure you have:
- ✅ Hostinger VPS with Ubuntu 22.04
- ✅ SSH access to your VPS
- ✅ Domain: `taskeasyapp.in` registered
- ✅ Domain pointed to VPS IP (DNS setup below)

---

## Step 1: DNS Configuration

### Option A: Hostinger DNS (Recommended)

If your domain is registered with Hostinger:

1. Login to **Hostinger hPanel**
2. Go to **Domains** → **taskeasyapp.in** → **DNS Zone / DNS Records**
3. Add these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `YOUR_VPS_IP` | 3600 |
| A | www | `YOUR_VPS_IP` | 3600 |
| A | api | `YOUR_VPS_IP` | 3600 |
| CNAME | * | `@` | 3600 |

**Replace `YOUR_VPS_IP`** with your Hostinger VPS IP address (found in VPS overview).

### Option B: External DNS (Cloudflare, GoDaddy, etc.)

Add these records at your DNS provider:

```
A Record:  @    → YOUR_VPS_IP
A Record:  www  → YOUR_VPS_IP
```

Wait 5-30 minutes for DNS to propagate.

### Verify DNS

```bash
# Run this on your LOCAL computer (not VPS)
nslookup taskeasyapp.in
# Should show your VPS IP
```

---

## Step 2: Connect to VPS

Open Terminal (Mac/Linux) or PowerShell (Windows) and connect:

```bash
ssh root@YOUR_VPS_IP
```

**Example:**
```bash
ssh root@192.168.1.100
```

You'll be prompted for your VPS root password.

---

## Step 3: Initial VPS Setup

Run these commands on your VPS:

```bash
# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y curl wget git unzip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installation
node -v    # Should show v20.x.x
npm -v     # Should show 10.x.x

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx
```

---

## Step 4: Create App Directory

```bash
# Create user for the app (recommended for security)
useradd -m -s /bin/bash taskdone

# Create directory
mkdir -p /var/www/taskdone
mkdir -p /var/www/taskdone/logs

# Set permissions
chown -R taskdone:taskdone /var/www/taskdone
chmod -R 755 /var/www/taskdone

# Set sudo access for taskdone user
usermod -aG sudo taskdone
```

---

## Step 5: Upload Application Files

**On your LOCAL computer** (where TaskDoneSaaS folder is):

```bash
# Navigate to project folder
cd TaskDoneSaaS

# Upload to VPS (excluding node_modules, .git, etc.)
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='.env' \
  ./ taskdone@YOUR_VPS_IP:/var/www/taskdone/

# Set correct ownership
# Back on VPS:
chown -R taskdone:taskdone /var/www/taskdone
```

**Alternative using SCP (if rsync not available):**
```bash
# On local computer
scp -r TaskDoneSaaS/* taskdone@YOUR_VPS_IP:/var/www/taskdone/
```

---

## Step 6: Configure Environment Variables

```bash
# Login as taskdone user
su - taskdone

# Navigate to backend
cd /var/www/taskdone/backend

# Create .env file
nano .env
```

**Paste this content (update with your values):**

```env
NODE_ENV=production
PORT=8080

# MongoDB - Get free cluster at https://cloud.mongodb.com
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/taskdone

# JWT Secret - Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=YOUR_LONG_RANDOM_SECRET_HERE

# CORS - Your domain
CORS_ALLOW_ANY_ORIGIN=false
CORS_ALLOWED_ORIGINS=https://taskeasyapp.in,https://www.taskeasyapp.in

# JWT
JWT_EXPIRES_IN=1d

# Optional: Redis (for caching)
# REDIS_URL=redis://localhost:6379

# Optional: Mistral AI (https://console.mistral.ai)
# MISTRAL_API_KEY=your_api_key

# Bootstrap settings
BOOTSTRAP_INCLUDE_SUPERADMIN=false
BOOTSTRAP_APPADMIN_EMAIL=admin@taskeasyapp.in
BOOTSTRAP_APPADMIN_PASSWORD=use-a-long-random-password
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 7: Install Dependencies & Build

```bash
# Install backend dependencies
cd /var/www/taskdone/backend
npm install --omit=dev

# Build frontend
cd /var/www/taskdone/frontend
npm install
npm run build

# Go back to app root
cd /var/www/taskdone
```

---

## Step 8: Setup PM2 (Process Manager)

```bash
# Create logs directory
mkdir -p /var/www/taskdone/logs

# Start backend with PM2
pm2 start deploy/ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script (auto-restart on reboot)
pm2 startup systemd -u taskdone --hp /home/taskdone
```

**Verify PM2 is running:**
```bash
pm2 status
# Should show: taskdone-backend ● online
```

---

## Step 9: Configure Nginx

```bash
# Copy nginx config
sudo cp /var/www/taskdone/deploy/nginx.conf /etc/nginx/sites-available/taskdone

# Enable the site
sudo ln -sf /etc/nginx/sites-available/taskdone /etc/nginx/sites-enabled/taskdone

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /test is successful
```

**Reload nginx:**
```bash
sudo systemctl reload nginx
```

---

## Step 10: Setup SSL Certificate (Let's Encrypt)

```bash
# Stop nginx temporarily for certbot
sudo systemctl stop nginx

# Obtain SSL certificate
sudo certbot certonly --standalone -d taskeasyapp.in -d www.taskeasyapp.in --agree-tos --email admin@taskeasyapp.in --non-interactive

# Start nginx
sudo systemctl start nginx

# Auto-renew SSL (runs daily at midnight)
echo "0 0 * * * certbot renew --quiet" | sudo tee -a /etc/crontab
```

**If certbot fails:** Your DNS may not be propagated yet. Wait and try again.

---

## Step 11: Update Nginx for SSL

```bash
sudo nano /etc/nginx/sites-available/taskdone
```

Find and uncomment the SSL lines (remove `#`):

```nginx
ssl_certificate /etc/letsencrypt/live/taskeasyapp.in/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/taskeasyapp.in/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
```

**Also remove these lines (self-signed cert):**
```nginx
# ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
# ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
```

```bash
# Reload nginx
sudo systemctl reload nginx
```

---

## Step 12: Bootstrap Admin Accounts

```bash
# As taskdone user
su - taskdone
cd /var/www/taskdone/backend
node src/scripts/bootstrapAdmins.js
```

**Bootstrap credentials:**
- **App Admin**: userId=`appadmin` unless `BOOTSTRAP_APPADMIN_USERID` is set
- **Password**: value of `BOOTSTRAP_APPADMIN_PASSWORD`
- **Login URL**: https://taskeasyapp.in/platform-login

---

## Step 13: Configure Firewall

```bash
# Setup UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## Step 14: Final Verification

Test from your local computer browser:

| Test | URL | Expected |
|------|-----|----------|
| Frontend | https://taskeasyapp.in | Login page |
| API Health | https://taskeasyapp.in/api/health | `{"success":true,"status":"ok"}` |
| App Admin Login | https://taskeasyapp.in/platform-login | Login form |

**CURL test from local computer:**
```bash
curl https://taskeasyapp.in/api/health
# Should return: {"success":true,"status":"ok"}

curl https://taskeasyapp.in/
# Should return HTML
```

---

## Common Commands Reference

```bash
# View app logs
pm2 logs taskdone-backend --lines 50

# Restart app
pm2 restart taskdone-backend

# Check app status
pm2 status

# Monitor app (live)
pm2 monit

# Check nginx status
sudo systemctl status nginx

# View nginx logs
sudo tail -f /var/log/nginx/error.log

# SSL certificate info
sudo certbot certificates

# Test SSL renewal
sudo certbot renew --dry-run
```

---

## Troubleshooting

### App Won't Start

```bash
# Check logs
pm2 logs taskdone-backend --err --lines 50

# Common issues:
# 1. MongoDB not accessible - Check MONGODB_URI
# 2. Port in use - pm2 restart or change PORT
# 3. Missing env vars - Check .env file
```

### SSL Certificate Issues

```bash
# Check if DNS propagated
nslookup taskeasyapp.in

# Try certbot again
sudo certbot certonly --standalone -d taskeasyapp.in -d www.taskeasyapp.in --agree-tos --email admin@taskeasyapp.in --non-interactive --force-renewal
```

### Nginx 502 Bad Gateway

```bash
# Check if backend is running
pm2 status

# Restart backend
pm2 restart taskdone-backend

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### DNS Not Propagating

```bash
# Check DNS from multiple locations
dig taskeasyapp.in
nslookup taskeasyapp.in

# Wait 24-48 hours for full propagation
```

---

## Update App (After Code Changes)

```bash
# SSH to VPS
ssh taskdone@YOUR_VPS_IP

# Pull latest code
cd /var/www/taskdone
git pull

# Rebuild frontend
cd frontend
npm install
npm run build

# Restart backend
pm2 restart taskdone-backend
```

---

## Support

For issues:
1. Check PM2 logs: `pm2 logs taskdone-backend --lines 100`
2. Check Nginx logs: `sudo tail -50 /var/log/nginx/error.log`
3. Verify MongoDB connection from VPS
4. Check firewall: `sudo ufw status`
