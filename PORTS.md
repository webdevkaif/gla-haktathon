# 🔌 ExpensePilot AI - Port Configuration & Quick Start Guide

This project is configured with standardized, deterministic ports so you can run and demo it with zero port conflicts.

---

## 🎯 Port Allocations

| Service | Port | Local URL | Network / Host | Description |
| :--- | :---: | :--- | :--- | :--- |
| **Frontend UI (Vite + React)** | `5173` | `http://localhost:5173` | `0.0.0.0:5173` | Interactive Autonomous Expense Dashboard |
| **Backend API (FastAPI + Uvicorn)** | `8000` | `http://127.0.0.1:8000` | `0.0.0.0:8000` | Real-time REST endpoints & AI Agent engine |
| **Swagger API Docs** | `8000` | `http://127.0.0.1:8000/docs` | `0.0.0.0:8000/docs` | Interactive API documentation |
| **Vite Preview** | `4173` | `http://localhost:4173` | `0.0.0.0:4173` | Production build preview |
| **MongoDB Atlas** | `27017` | `cluster0.cllnh1c.mongodb.net` | Outbound TLS | Real-time Cloud Database |

---

## 🚀 1-Click Launch Options

You can launch both the Frontend and Backend together using any of these commands from the project root:

### Option 1: Via npm (Recommended)
```bash
npm start
```
*(or `npm run dev`)*

### Option 2: Via Shell Script (Mac / Linux)
```bash
./start.sh
```

### Option 3: Via Python Runner
```bash
python run.py
```

---

## 🛠️ Individual Service Commands

If you prefer to run services in separate terminal windows:

### Terminal 1: Backend API (Port 8000)
```bash
# Uses backend virtual environment automatically
python run.py
```
> Or directly: `uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload`

### Terminal 2: Frontend (Port 5173)
```bash
npm --prefix frontend run dev
```

---

## ⚙️ Custom Port Overrides

If you ever need to run on custom ports, you can specify them via environment variables:

```bash
# Custom backend port:
PORT=8080 python run.py

# Custom frontend port:
npm --prefix frontend run dev -- --port 3000
```
