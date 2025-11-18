# Project Context: Webgeon Admin Tool

## 1. 🎯 Project Overview

**Goal:** Build an internal tool for a company  to manage customer outreach.
[cite_start]**Scenario:** An admin needs to log in, manage a team of 5 agents, upload customer lists, and have the system automatically distribute those customers to the agents[cite: 2, 3, 4].

## 2. 👤 Core Roles & Flow

1.  [cite_start]**Admin:** Logs into a secure dashboard[cite: 10].
2.  [cite_start]**Admin:** Creates and manages 5 agent profiles[cite: 7, 12].
3.  [cite_start]**Admin:** Uploads a customer list (CSV/XLS/XLSX)[cite: 21].
4.  [cite_start]**System (Backend):** Parses the file, validates it, and automatically distributes the customer entries among the 5 agents[cite: 23, 24].
5.  [cite_start]**System (Backend):** Saves the assigned lists to MongoDB[cite: 27].
6.  [cite_start]**Admin:** Views the results of the distribution on the frontend[cite: 27].

## 3. 📋 Key Feature Checklist

### Admin & Authentication
* [cite_start][ ] Admin login via `email` and `password`[cite: 10].
* [cite_start][ ] Authenticate credentials against a **MongoDB** database[cite: 10].
* [cite_start][ ] Use **JWT (JSON Web Token)** to secure the session and protect dashboard access[cite: 11].

### Agent Management
* [cite_start][ ] Admin must be able to add/manage **5 agents**[cite: 7].
* [ ] Agent data model must include:
    * [cite_start][ ] `Name` [cite: 15]
    * [cite_start][ ] `Email` [cite: 17]
    * [cite_start][ ] `Mobile Number` (with country code) [cite: 18]
    * [cite_start][ ] `Password` [cite: 20]

### Customer List Upload
* [cite_start][ ] Admin can upload customer lists[cite: 21].
* [cite_start][ ] **Accepted formats:** `.CSV`, `.XLSX`, `.XLS`[cite: 21].
* [cite_start][ ] **File Content:** The file will contain fields like `FirstName`, `Phone`, `Notes`[cite: 22].
* [cite_start][ ] System must **validate** the file type and structure before processing[cite: 23].

### Core Distribution Logic (Backend)
* [cite_start][ ] After validation, the system must parse the data[cite: 24].
* [cite_start][ ] Distribute all customer entries **equally** among the 5 agents[cite: 24].
* [cite_start][ ] **Edge Case:** If the total entries are not divisible by 5, assign the remaining entries **sequentially**[cite: 25, 26].
    * *Example: 27 entries. Agent 1 gets 6, Agent 2 gets 6, Agent 3 gets 5, Agent 4 gets 5, Agent 5 gets 5.*
* [cite_start][ ] Save each agent's assigned list into MongoDB[cite: 27].
* [cite_start][ ] Display the final assigned lists on the frontend for the admin to review[cite: 27].

## 4. 💻 Technical Requirements

* [cite_start]**Database:** MongoDB [cite: 29]
* [cite_start]**Backend:** Express.js, Node.js [cite: 29]
* [cite_start]**Frontend:** React.js / Next.js [cite: 29]
* [cite_start]**Config:** Store sensitive values (DB URI, JWT secret) in a `.env` file[cite: 38].
* [cite_start]**Code:** Must be clean, well-commented, and readable[cite: 30].
* **Error Handling:** Gracefully handle all errors, including:
    * [cite_start][ ] Invalid login [cite: 32]
    * [cite_start][ ] Incorrect file formats [cite: 33]
    * [cite_start][ ] File parsing issues [cite: 35]
    * [cite_start][ ] Distribution edge cases [cite: 37]

## 5. 📦 Data Models (Mongoose Schemas)

```javascript
// /models/Admin.js (or User.js)
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// /models/Agent.js
const agentSchema = new mongoose.Schema({
  [cite_start]name: { type: String, required: true }, // [cite: 15]
  [cite_start]email: { type: String, required: true, unique: true }, // [cite: 17]
  [cite_start]mobile: { type: String, required: true }, // [cite: 18]
  [cite_start]password: { type: String, required: true }, // [cite: 20]
  assignedCustomers: [
    {
      [cite_start]FirstName: { type: String }, // [cite: 22]
      [cite_start]Phone: { type: String }, // [cite: 22]
      [cite_start]Notes: { type: String }, // [cite: 22]
    }
  ]
});