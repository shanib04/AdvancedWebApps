# AdvancedWebApps

REST API project for the **Advanced Web Applications** course.

This project implements a Posts API (and prepares infrastructure for a Comments API) using **Node.js**, **Express**, **TypeScript**, and **MongoDB**. Testing is done manually via **REST Client** (`request.rest`).

Repository: [https://github.com/shanib04/AdvancedWebApps.git](https://github.com/shanib04/AdvancedWebApps.git)

---

## Tech Stack

- Node.js (LTS recommended)
- Express
- TypeScript
- MongoDB (remote college server)
- Mongoose
- dotenv
- REST Client (VS Code extension)

---

## Prerequisites

- **Node.js (LTS)**: [https://nodejs.org](https://nodejs.org)
- **VS Code**: [https://code.visualstudio.com](https://code.visualstudio.com)
- **VS Code Extension**: REST Client (by Huachao Mao)
- **College SSL VPN** (mandatory to access MongoDB)

### VPN Guides (Official)

- **Windows**: [https://db.cs.colman.ac.il/downloads/SSL-VPN-Client-WIN.pdf](https://db.cs.colman.ac.il/downloads/SSL-VPN-Client-WIN.pdf)
- **macOS**: [https://db.cs.colman.ac.il/downloads/SSL-VPN-Client-MAC.pdf](https://db.cs.colman.ac.il/downloads/SSL-VPN-Client-MAC.pdf)

> ⚠️ Without VPN, MongoDB is unreachable and the app will not work.

---

## Setup & Run (Step by Step)

### 1) Clone the repository

```bash
git clone https://github.com/shanib04/AdvancedWebApps.git
cd AdvancedWebApps
```

### 2) Install dependencies

```bash
npm install
```

---

## Environment Variables (.env)

This project uses **dotenv** for configuration.

### 1) Create a `.env` file in the project root

```env
PORT=3000

MONGO_URI=mongodb://admin:bartar20%40CS@10.10.246.32:21771/posts_app?authSource=admin
```

### 2) Important notes

- `%40` is the encoded form of `@` in the database password
- `authSource=admin` is required for MongoDB authentication
- The MongoDB server is accessible **only via VPN**

### 3) Security

- `.env` is ignored by Git and **must not be committed**
- Each developer should maintain their own `.env` file

---

## Run the Server (Development)

```bash
npm run dev
```

Expected output:

```text
MongoDB connected
Server is running on port 3000
```

---

## Project Structure (What each folder/file does)

```
AdvancedWebApps/
│
├── src/
│   ├── config/
│   │   └── db.ts
│   │      └─ MongoDB connection logic (uses MONGO_URI from .env)
│   │
│   ├── controllers/
│   │   ├── post.controller.ts
│   │   │  └─ Business logic for Posts API (create, read, update)
│   │   └── comment.controller.ts
│   │      └─ Business logic for Comments API (implemented by partner)
│   │
│   ├── models/
│   │   ├── post.model.ts
│   │   │  └─ Mongoose schema for Post documents
│   │   └── comment.model.ts
│   │      └─ Mongoose schema for Comment documents
│   │
│   ├── routes/
│   │   ├── post.routes.ts
│   │   │  └─ HTTP routes for Posts (maps URLs to controllers)
│   │   └── comment.routes.ts
│   │      └─ HTTP routes for Comments
│   │
│   ├── app.ts
│   │   └─ Express app configuration (middlewares, routes, DB connection)
│   │
│   ├── server.ts
│   │   └─ Application entry point (loads env vars and starts server)
│   │
│   └── request.rest
│       └─ Manual API tests using REST Client (required by the assignment)
│
├── package.json
│   └─ Project metadata, scripts, and dependencies
│
├── package-lock.json
│   └─ Exact dependency versions
│
├── tsconfig.json
│   └─ TypeScript compiler configuration
│
├── nodemon.json
│   └─ Nodemon configuration for TypeScript development
│
└── README.md
    └─ Project documentation
```

---

## API Testing (request.rest)

Open `src/request.rest`.

**Important:** Each request must be separated using:

```
###
```

Example:

```http
### Create a new post
POST http://localhost:3000/post
Content-Type: application/json

{
  "sender": "JohnDoe",
  "content": "Hello"
}

###

### Get all posts
GET http://localhost:3000/post
```

Click **Send Request** above each block.

---

## Common Issues & Fixes

### No "Send Request" button in REST Client

- Ensure requests are separated by `###`

### MongoDB timeout / buffering errors

- Ensure **SSL VPN** is connected
- Restart the server after connecting VPN

### Authentication failed

- Verify `%40` encoding in password
- Verify `authSource=admin` exists in the connection string
- Verify VPN connection

---

## Collaboration Notes

- **Posts API**: implemented by Itay
- **Comments API**: implemented by Shani
