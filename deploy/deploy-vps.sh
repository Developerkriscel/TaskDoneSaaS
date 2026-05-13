#!/bin/bash
# ============================================================
# TaskDoneSaaS VPS Deployment Script
# For Hostinger VPS (Ubuntu 22.04+)
# ============================================================
#
# USAGE:
#   chmod +x deploy-vps.sh
#   ./deploy-vps.sh
#
# PREREQUISITES on your VPS:
#   - Ubuntu 22.04 (recommended)
#   - SSH access to your VPS
#   - Domain pointed to your VPS IP (optional)
#
# WHAT THIS SCRIPT DOES:
#   1. Installs Node.js 20 LTS, Nginx, PM2
#   2. Creates app user and directories
#   3. Installs SSL certificate (Let's Encrypt)
#   4. Builds frontend
#   5. Deploys backend with PM2
#   6. Configures Nginx reverse proxy
#   7. Sets up auto-restart on reboot
#
# ============================================================

set -e

# ---- COLORS ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- CONFIG ----
APP_NAME="taskdone"
APP_USER="taskdone"
APP_DIR="/var/www/taskdone"
DOMAIN=""
USE_SSL=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --no-ssl)
      USE_SSL=false
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# ---- PRE-FLIGHT ----
log_info "TaskDoneSaaS VPS Deployment"
log_info "================================"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
  log_error "Please run as root (use sudo)"
  exit 1
fi

# Get domain if not provided
if [[ -z "$DOMAIN" ]]; then
  read -p "Enter your domain name (e.g., app.example.com) or press Enter for IP-only: " DOMAIN
fi

# ---- UPDATE SYSTEM ----
log_info "Updating system packages..."
apt update && apt upgrade -y

# ---- INSTALL DEPENDENCIES ----
log_info "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
log_ok "Node.js $(node -v) installed"

log_info "Installing PM2, Nginx, Certbot..."
npm install -g pm2
apt-get install -y nginx certbot python3-certbot-nginx
log_ok "PM2, Nginx, Certbot installed"

# ---- CREATE APP USER ----
log_info "Creating app user '$APP_USER'..."
id "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
log_ok "App user and directories created"

# ---- CREATE LOGS DIR ----
mkdir -p /var/www/taskdone/logs
chown -R "$APP_USER:$APP_USER" /var/www/taskdone/logs

# ---- COPY APP FILES ----
log_info "Copying application files..."
rsync -a --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='.env' \
  "$(dirname "$(realpath "$0")")/../" /var/www/taskdone/
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
log_ok "Application files copied"

# ---- INSTALL BACKEND DEPENDENCIES ----
log_info "Installing backend dependencies..."
cd "$APP_DIR/backend"
sudo -u "$APP_USER" npm install --omit=dev
log_ok "Backend dependencies installed"

# ---- BUILD FRONTEND ----
log_info "Building frontend..."
cd "$APP_DIR/frontend"
sudo -u "$APP_USER" npm install
sudo -u "$APP_USER" npm run build
log_ok "Frontend built"

# ---- CREATE .ENV FILE ----
ENV_FILE="$APP_DIR/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  log_warn "No .env file found!"
  log_info "Please create $ENV_FILE with your configuration."
  log_info "See $APP_DIR/backend/.env.example for template."
  echo ""
  read -p "Enter MONGODB_URI: " MONGODB_URI
  read -p "Enter JWT_SECRET (or press Enter to generate): " JWT_SECRET

  if [[ -z "$JWT_SECRET" ]]; then
    JWT_SECRET=$(sudo -u "$APP_USER" node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
  fi

  cat > "$ENV_FILE" << EOF
NODE_ENV=production
PORT=8080
MONGODB_URI=$MONGODB_URI
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=1d
COOKIE_AUTH_ENABLED=false
COOKIE_SECURE=true
COOKIE_SAMESITE=none
CORS_ALLOW_ANY_ORIGIN=false
CORS_ALLOWED_ORIGINS=https://${DOMAIN:-localhost}
BOOTSTRAP_INCLUDE_SUPERADMIN=false
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log_ok ".env file created"
else
  log_ok ".env file already exists"
fi

# ---- SETUP PM2 ----
log_info "Setting up PM2..."
sudo -u "$APP_USER" pm2 start "$APP_DIR/deploy/ecosystem.config.js"
sudo -u "$APP_USER" pm2 save
sudo -u "$APP_USER" env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp /home/"$APP_USER" | tail -1 | tee /tmp/pm2_startup.sh
bash /tmp/pm2_startup.sh
log_ok "PM2 configured and running"

# ---- SETUP NGINX ----
log_info "Configuring Nginx..."
NGINX_CONF="/etc/nginx/sites-available/taskdone"
if [[ -n "$DOMAIN" ]]; then
  sed "s/YOUR_DOMAIN_OR_IP/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf" > "$NGINX_CONF"
else
  sed "s/YOUR_DOMAIN_OR_IP/server_ip/g" "$APP_DIR/deploy/nginx.conf" > "$NGINX_CONF"
fi

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/taskdone
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx
log_ok "Nginx configured"

# ---- SSL CERTIFICATE ----
if [[ "$USE_SSL" == true ]] && [[ -n "$DOMAIN" ]]; then
  log_info "Setting up SSL certificate..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN"
  # Auto-renew
  echo "0 0 * * * certbot renew --quiet" | crontab -
  log_ok "SSL certificate configured"
elif [[ -n "$DOMAIN" ]]; then
  log_warn "Skipping SSL (--no-ssl flag used)"
else
  log_warn "No domain provided, skipping SSL setup"
fi

# ---- FIREWALL ----
log_info "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
log_ok "Firewall configured"

# ---- FINAL STATUS ----
echo ""
log_ok "============================================"
log_ok "TaskDoneSaaS deployment complete!"
log_ok "============================================"
echo ""
log_info "Backend API:  http://127.0.0.1:8080"
log_info "Frontend:    $APP_DIR/frontend/dist"
log_info "Logs:        $APP_DIR/logs/"
echo ""
log_info "Useful commands:"
echo "  sudo -u $APP_USER pm2 status         # Check app status"
echo "  sudo -u $APP_USER pm2 logs           # View logs"
echo "  sudo -u $APP_USER pm2 restart all    # Restart app"
echo "  systemctl status nginx               # Check nginx"
echo "  certbot --nginx -d $DOMAIN           # Renew SSL"
echo ""
if [[ -n "$DOMAIN" ]]; then
  log_ok "Your app should be live at: https://$DOMAIN"
else
  log_ok "Access your app at the server IP (configure DNS to point to this IP)"
fi
