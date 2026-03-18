# VibeIS - Advanced Web Apps Final Project

Full-stack social media web application by Itay and Shani.

## Technologies

**Backend:** Node.js, Express, TypeScript, MongoDB, JWT, Google OAuth, Gemini AI, Swagger, Jest

**Frontend:** React, TypeScript, Vite, Bootstrap, Axios

**DevOps:** PM2, Nginx, HTTPS/TLS

## Key Features

- Posts, comments, likes, and saves
- AI-powered draft generation and search (Google Gemini + Unsplash)
- Google OAuth and classic email/password login
- Image uploads for posts and profiles
- Swagger API docs at `/docs`

## Project Structure

```
AdvancedWebApps/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── models/           # MongoDB schemas
│   │   ├── routes/           # API endpoints
│   │   ├── middleware/       # JWT auth, file upload
│   │   ├── config/           # DB connection, Swagger setup
│   │   ├── utils/            # Shared utilities
│   │   └── tests/            # Jest test suites
│   ├── .env.example          # Dev environment template
│   └── .envprod.example      # Production environment template
├── frontend/                 # React web app
│   ├── src/
│   │   ├── components/       # UI components organized by feature
│   │   │   ├── ai/
│   │   │   ├── auth/
│   │   │   ├── comments/
│   │   │   ├── feed/
│   │   │   ├── layout/
│   │   │   ├── profile/
│   │   │   └── shared/
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page-level route components
│   │   ├── services/         # Axios API client
│   │   ├── types/            # Shared TypeScript models
│   │   └── utils/            # Date formatting, feed cache, session user, etc.
│   ├── .env.example          # Dev environment template
│   ├── .env.production.example # Production environment template
│   └── vite.config.ts        # Build config
├── certs/                    # SSL certificates (excluded from git)
├── ecosystem.config.js       # PM2 configuration
└── README.md
```

## Quick Start

### Development

Run both services simultaneously in separate terminals:

**Backend:**

```bash
cd backend
npm install
cp .env.example .env        # edit values
npm run dev
```

Backend runs on `http://localhost:3000`  
Swagger API docs: `http://localhost:3000/docs`

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env        # edit values
npm run dev
```

Frontend runs on `http://localhost:5173`  
API calls proxied to `http://localhost:3000`

### Production

#### Setup (One-time)

1. Create certificate folder and add TLS certs:

   ```bash
   mkdir certs
   # Add vibeis.key and vibeis.crt to this folder
   ```

2. Configure environment files:

   ```bash
   cp backend/.envprod.example backend/.envprod
   cp frontend/.env.production.example frontend/.env.production
   ```

3. Build both applications:
   ```bash
   cd backend && npm run build
   cd frontend && npm run build
   ```

#### Option A: Run with `npm run prod` (Single process)

**Quick testing** - runs backend and frontend sequentially:

```bash
# From backend/
npm run prod

# From frontend/
npm run prod
```

#### Option B: Run with PM2 (Production)

```bash
# From project root
pm2 start ecosystem.config.js --env production
```

View logs:

```bash
pm2 logs                     # All services
pm2 logs REST-SERVER         # Backend only
pm2 logs FRONTEND-SERVER     # Frontend only
```

Stop all services:

```bash
pm2 stop all
pm2 delete all
```

## Access in Production

**Frontend (Web App):**

```
https://node32.cs.colman.ac.il/
```

**Backend API & Swagger Docs:**

```
https://node32.cs.colman.ac.il/docs/
```
