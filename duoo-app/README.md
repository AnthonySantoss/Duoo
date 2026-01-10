# Duoo - Personal Finance for Couples

## Project Structure
- **/server**: Node.js + Express + Sequelize Backend
- **/client**: React + Vite + Tailwind Frontend

## Getting Started

### Prerequisites
- Node.js (v18+)
- NPM

### 1. Setup Backend
```bash
cd duoo-app/server
npm install
npm run dev
```
The server will start on http://localhost:5000 and create the `database.sqlite` file automatically.

### 2. Setup Frontend
```bash
cd duoo-app/client
npm install
npm run dev
```
The frontend will start on http://localhost:5173.

### 3. Usage
1. Open the frontend.
2. Register a new account.
3. You will be redirected to the Dashboard.

## Features Implemented
- **Authentication**: JWT based Login/Register.
- **Architecture**: MVC Backend, Component-based Frontend.
- **Database**: SQLite with Sequelize Models (User, Wallet, Transaction, Goal).
- **UI**: High-fidelity recreation of the prototype using TailwindCSS.
- **State**: React Context for Authentication.
