#!/bin/bash
# Expense Pilot (Meridian DEV-C04) All-in-One Startup Script

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Free ports 8000 and 5173 if occupied by stale processes
lsof -ti :8000,:5173 2>/dev/null | xargs kill -9 2>/dev/null || true

if [ -f "backend/.venv/bin/python" ]; then
    PYTHON_CMD="$PROJECT_ROOT/backend/.venv/bin/python"
else
    PYTHON_CMD="python3"
fi

echo "============================================================="
echo "🚀 Starting Expense Pilot (Meridian DEV-C04) Full Platform..."
echo "============================================================="
echo "📡 Python runtime : $PYTHON_CMD"
echo "🌐 Frontend UI   : http://localhost:5173"
echo "⚙️  Backend API   : http://127.0.0.1:8000"
echo "📚 API Swagger   : http://127.0.0.1:8000/docs"
echo "============================================================="

# Trap exit to kill child processes cleanly
trap 'kill 0' SIGINT SIGTERM EXIT

# Start backend in background
export PYTHONPATH="$PROJECT_ROOT"
export PORT=8000
export HOST=0.0.0.0
(cd "$PROJECT_ROOT/backend" && "$PYTHON_CMD" run.py) &

# Start frontend in foreground
(cd "$PROJECT_ROOT/frontend" && npm run dev)

