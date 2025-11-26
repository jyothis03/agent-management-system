## Webgeon Admin Tool

Internal dashboard that lets an admin log in, manage a tiny pool of agents (max five), upload customer spreadsheets, and have the backend automatically divide those leads between everyone. The goal was to keep it simple but reliable so you can demo the flow end to end without extra tooling.

---

### What’s inside
- **Backend (`/backend`)** – Express + MongoDB API handling auth, agent CRUD, uploads, and distribution history.
- **Frontend (`/frontend`)** – React single page app with a login screen and a simple dashboard (agents, uploads, history).
- **context.md** – Assignment brief and acceptance criteria I kept nearby while building.

---

### Tech stack
- Node 18+, Express, Multer, PapaParse, XLSX, JWT
- MongoDB Atlas
- React + Vite scripts with Tailwind

---

### Prerequisites
1. Node.js ≥ 18 and npm
2. Access to a MongoDB instance
3. Two `.env` files (one for backend, one for frontend)

Backend `.env` example:
```
MONGODB_URI=mongodb://localhost:27017/webgeon
JWT_SECRET=super-secret-string
PORT=5000
```

Frontend `.env` example:
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

### Getting started
1. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. **Run the backend**
   ```bash
   cd backend
   npm start
   ```
   The server boots on `PORT` (defaults to `5000`) and prints when Mongo connects.
3. **Run the frontend**
   ```bash
   cd frontend
   npm start
   ```
   CRA dev server comes up on `http://localhost:3000` and proxies API calls using `REACT_APP_API_URL`.

---

### Using the app
1. Visit `http://localhost:3000`.
2. Log in with the seeded admin account (default: `admin@webgeon.com` / `admin123`, or whatever you created in the DB).
3. On the **Manage Agents** tab, create up to five agents. Passwords are hashed automatically.
4. Switch to **Upload Customers**, select a CSV/XLS/XLSX file containing `FirstName`, `Phone`, (optional) `Notes`, then upload. The backend parses the file, validates rows, and spreads customers evenly in round-robin order.
5. **View Distribution** to see current agent queues, or **Distribution History** for past uploads with drilled-down detail.

---