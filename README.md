# TaskDoneSaaS

A comprehensive task management SaaS platform built with MERN stack (MongoDB, Express, React, Node.js).

## Features

- **Task Management**: Delegation, Checklists, Work Requests
- **Approval Workflows**: Submit, Approve, Reject tasks
- **MIS Reports**: Detailed performance reports and analytics
- **FMS System**: Field Management System integration
- **AI Chat Assistant**: Mistral AI-powered chatbot
- **Multi-tenant**: Support for multiple companies/organizations
- **Role-based Access**: Super Admin, Admin, Employee roles

## Tech Stack

### Backend
- Node.js 20
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- PM2 Process Manager

### Frontend
- React 18
- Vite
- React Router
- Axios
- SweetAlert2

### Infrastructure
- Nginx (Reverse Proxy)
- Let's Encrypt (SSL)
- MongoDB Atlas (Database)

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/Developerkriscel/TaskDoneSaaS.git
cd TaskDoneSaaS

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Frontend setup
cd ../frontend
npm install
npm run dev
```

### Configuration

Create `backend/.env` file:

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskdone
JWT_SECRET=your-long-random-secret
CORS_ALLOWED_ORIGINS=https://yourdomain.com
BOOTSTRAP_APPADMIN_EMAIL=admin@yourdomain.com
BOOTSTRAP_APPADMIN_PASSWORD=use-a-long-random-password
```

## Deployment

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

### VPS Deployment (Recommended)

1. Clone repo on VPS
2. Configure `.env`
3. Build frontend
4. Start with PM2
5. Setup Nginx + SSL
6. Bootstrap admin accounts

```bash
# Bootstrap admin
cd backend
node src/scripts/bootstrapAdmins.js
```

### Bootstrap Credentials

| Role | User ID | Password |
|------|---------|----------|
| App Admin | `BOOTSTRAP_APPADMIN_USERID` or `appadmin` | value of `BOOTSTRAP_APPADMIN_PASSWORD` |

## Project Structure

```
TaskDoneSaaS/
├── backend/
│   ├── src/
│   │   ├── config/        # Database, cache, env config
│   │   ├── controllers/   # Route handlers
│   │   ├── jobs/         # Cron jobs
│   │   ├── middlewares/   # Auth, error handling
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   ├── scripts/      # Bootstrap scripts
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── store/        # Context/state
│   │   └── utils/        # Utilities
│   ├── public/           # Static files
│   └── package.json
├── deploy/               # Deployment configs
│   ├── nginx.conf        # Nginx config
│   ├── ecosystem.config.js  # PM2 config
│   └── deploy-vps.sh    # Deploy script
├── docs/                 # Documentation
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### Tasks
- `GET /api/v1/tasks/pending` - Pending tasks
- `GET /api/v1/tasks/delegations` - Delegations
- `GET /api/v1/tasks/checklists` - Checklists
- `POST /api/v1/tasks/submit` - Submit task

### Platform (App Admin)
- `GET /api/v1/platform/overview` - Platform stats
- `GET /api/v1/platform/companies` - List companies
- `GET /api/v1/platform/users` - Manage users

### RPC Endpoints
- `POST /api/rpc/secure` - Secure RPC calls
- `POST /api/rpc` - Public RPC calls

## License

Copyright 2024 Kriscel Tech Pvt Ltd. All rights reserved.

## Support

For support, contact: krisceltech.3@gmail.com
