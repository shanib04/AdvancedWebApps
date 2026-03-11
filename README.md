# VibeIS - Advanced Web Apps Final Project

Full-stack web application by Itay and Shani.

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, MongoDB, JWT
- **Frontend:** React, TypeScript, Vite
- **DevOps:** PM2, Nginx, HTTPS SSL/TLS
- **Testing:** Jest (backend)

## Project Structure

```
AdvancedWebApps/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── models/           # MongoDB schemas
│   │   ├── routes/           # API endpoints
│   │   ├── middleware/       # Auth, validation
│   │   ├── config/           # DB, Swagger setup
│   │   └── tests/            # Unit tests
│   └── .envprod             # Production environment
├── frontend/                 # React web app
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API client
│   │   ├── hooks/            # Custom hooks
│   │   └── pages/            # Page components
│   └── vite.config.ts       # Build config
├── certs/                    # SSL certificates (not in git)
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
npm run dev
```

Backend runs on `http://localhost:3000`  
Swagger API docs: `http://localhost:3000/docs`

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`  
API calls proxied to `http://localhost:3000`

### Production

#### Setup (One-time)

1. Create certificate folder:

   ```bash
   mkdir certs
   # Add client-key.pem and client-cert.pem to this folder
   ```

2. Install PM2 globally:

   ```bash
   npm install -g pm2
   ```

3. Configure environment files:

   ```bash
   cp backend/.envprod.example backend/.envprod
   cp frontend/.env.example frontend/.env.production
   ```

4. Edit `backend/.envprod` with your production MongoDB URI and secrets

5. Build both applications:
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
pm2 logs          # All services
pm2 logs "REST SERVER"     # Backend only
pm2 logs "FRONTEND SERVER"  # Frontend only
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
