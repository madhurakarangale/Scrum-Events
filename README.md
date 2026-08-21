# ScrumFlow Pro 🚀

Enterprise-grade Agile Project Management & Scrum Task Board Tool.

## 🌐 Live Demo & Deployment

- **Live GitHub Pages URL**: [https://madhurakarangale.github.io/Scrum-Events/](https://madhurakarangale.github.io/Scrum-Events/)
- **Demo Mode**: Instant 1-click access with offline localStorage persistence.
- **Backend API Support**: Configurable connecting to local Node.js / PostgreSQL or cloud deployments (Render, Railway, Vercel).

---

## ✨ Features

- 🔐 **Authentication**: JWT authentication with fallback offline storage.
- 📝 **Story Management**: Create, view, estimate story points (Fibonacci sequence: 1, 2, 3, 5, 8, 13).
- 📊 **Agile Task Board**: Move stories seamlessly between *To Do* ➔ *In Progress* ➔ *Done*.
- ⚡ **Automated Velocity**: Real-time sprint velocity calculation based on completed story points.
- 📋 **Activity Audit Log**: Live tracking of actions (create, move, delete, reset, import, export) with timestamps.
- 💾 **PostgreSQL Database**: Persistent project storage with automatic schema initialization.
- 📦 **JSON Import & Export**: One-click sprint backup and restore.
- 🎨 **Responsive UI**: Sleek, modern interface with dark/light visual contrast, status dots, and micro-animations.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+), Font Awesome 6, Inter Font
- **Backend**: Node.js, Express.js, PostgreSQL (`pg`)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **Hosting**: GitHub Pages (Frontend), GitHub Actions CI/CD workflow

---

## 🚀 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher)

### Quick Start

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Database**:
   Set up `.env` or `backend/.env` with your PostgreSQL connection string:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/scrumflow
   PORT=5000
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=development
   ```

3. **Start the Application**:
   From the project root:
   ```bash
   npm start
   ```
   or
   ```bash
   node backend/server.js
   ```

4. **Access the App**:
   Open [http://localhost:5000](http://localhost:5000) in your web browser.

---

## 🚢 GitHub Pages Deployment

The repository is configured for GitHub Pages in two ways:
1. **GitHub Actions Workflow** (`.github/workflows/deploy-pages.yml`): Automatically publishes the `docs/` folder on every push to `main`.
2. **Standard Branch Publishing**:
   - Go to your repository on GitHub ➔ **Settings** ➔ **Pages**.
   - Under **Build and deployment** ➔ **Source**, select **GitHub Actions** (or select **Deploy from a branch** ➔ `main` ➔ `/docs`).