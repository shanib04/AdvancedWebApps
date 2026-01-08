# AdvancedWebApps

REST API project for the **Advanced Web Applications** course.

This project implements a Posts API (and prepares infrastructure for a Comments API) using **Node.js**, **Express**, and **MongoDB**. Testing is done manually via **REST Client** (`request.rest`).

Repository: [https://github.com/shanib04/AdvancedWebApps.git](https://github.com/shanib04/AdvancedWebApps.git)

---

## Tech Stack

- Node.js (LTS recommended)
- Express
- MongoDB (remote college server)
- Mongoose
- REST Client (VS Code extension)

---

## Prerequisites

- **Node.js (LTS)**: [https://nodejs.org](https://nodejs.org)
- **VS Code Extension**: REST Client
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

### 3) Verify MongoDB connection (VERY IMPORTANT)

Open `src/config/db.js` and ensure it contains **exactly**:

```js
const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb://admin:bartar20%40CS@10.10.246.32:21771/posts_app?authSource=admin"
  );

  console.log("MongoDB connected");
};

module.exports = connectDB;
```

**Notes:**

- `%40` encodes `@` in the password (`bartar20@CS`)
- `authSource=admin` is required for authentication
- `10.10.246.32` is the internal college server

### 4) Run the server

```bash
npm run dev
```

Expected output:

```text
MongoDB connected
Server is running on port 4000
```

---

## Project Structure (What each folder/file does)

```
AdvancedWebApps/
│
├── src/
│   ├── config/
│   │   └── db.js
│   │      └─ MongoDB connection configuration (mongoose)
│   │
│   ├── controllers/
│   │   ├── post.controller.js
│   │   │  └─ Business logic for Posts API (create, get, update)
│   │   └── comment.controller.js
│   │      └─ Business logic for Comments API (implemented by partner)
│   │
│   ├── models/
│   │   ├── post.model.js
│   │   │  └─ Mongoose schema for Post documents
│   │   └── comment.model.js
│   │      └─ Mongoose schema for Comment documents
│   │
│   ├── routes/
│   │   ├── post.routes.js
│   │   │  └─ HTTP routes for Posts (maps URLs to controllers)
│   │   └── comment.routes.js
│   │      └─ HTTP routes for Comments
│   │
│   ├── app.js
│   │   └─ Express app configuration (middlewares + routes)
│   │
│   ├── server.js
│   │   └─ Server entry point (app.listen)
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
└── README.md
    └─ Project documentation
```

---

## API Testing (request.rest)

Open `src/request.rest`.

**Important:** Separate requests with `###` so REST Client recognizes each request.

Example:

```http
### Create a new post
POST http://localhost:4000/post
Content-Type: application/json

{
  "sender": "JohnDoe",
  "content": "Hello"
}

###

### Get all posts
GET http://localhost:4000/post
```

Click **Send Request** above each block.

---

## Common Issues & Fixes

### No "Send Request" button

- Add `###` between requests in `request.rest`.

### MongoDB timeout / buffering errors

- Connect to **SSL VPN**.
- Restart the server (`npm run dev`).

### Authentication failed

- Ensure the connection string includes:

  - `%40` in the password
  - `authSource=admin`
  - Correct server IP (`10.10.246.32`)

---

## Collaboration Notes

- **Posts API**: implemented by Itay
- **Comments API**: implemented by Shani

---
