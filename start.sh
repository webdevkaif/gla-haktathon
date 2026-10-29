#!/bin/bash
# ExpensePilot AI All-in-One Startup Script

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if [ -f "backend/.venv/bin/python" ]; then
    PYTHON_CMD="$PROJECT_ROOT/backend/.venv/bin/python"
else
    PYTHON_CMD="python3"
fi

echo "============================================================="
echo "🚀 Starting ExpensePilot AI Full-Stack Platform..."
echo "============================================================="
echo "📡 Python runtime : $PYTHON_CMD"
echo "🌐 Frontend UI   : http://127.0.0.1:5173"
echo "⚙️  Backend API   : http://127.0.0.1:8000"
echo "📚 API Swagger   : http://127.0.0.1:8000/docs"
echo "-------------------------------------------------------------"

# Trap exit to kill child processes cleanly
trap 'kill 0' SIGINT SIGTERM EXIT

# Start backend in background
export PYTHONPATH="$PROJECT_ROOT"
(cd "$PROJECT_ROOT/backend" && "$PYTHON_CMD" run.py) &

# Start frontend in foreground
(cd "$PROJECT_ROOT/frontend" && npm run dev -- --host 127.0.0.1 --port 5173)
