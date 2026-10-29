#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Forward to backend/run.py
backend_dir = Path(__file__).resolve().parent / "backend"
run_script = backend_dir / "run.py"

if __name__ == "__main__":
    venv_python = backend_dir / ".venv" / "bin" / "python"
    executable = str(venv_python) if venv_python.exists() else sys.executable
    os.execv(executable, [executable, str(run_script)] + sys.argv[1:])

