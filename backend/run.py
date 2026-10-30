import sys
import os
import subprocess
from pathlib import Path

# Fix Windows console UTF-8 encoding
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    os.environ["PYTHONIOENCODING"] = "utf-8"

# Auto-switch to backend/.venv python if run with system/external python
backend_dir = Path(__file__).resolve().parent
venv_python = backend_dir / ".venv" / "bin" / "python"
if venv_python.exists() and sys.executable != str(venv_python):
    try:
        import uvicorn
    except ImportError:
        os.execv(str(venv_python), [str(venv_python)] + sys.argv)

project_root = backend_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

os.environ["PYTHONPATH"] = str(project_root) + (os.pathsep + os.environ.get("PYTHONPATH", ""))

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))

    # Auto-free port if an orphaned process is holding it
    if sys.platform != "win32":
        try:
            out = subprocess.check_output(["lsof", "-ti", f":{port}"], stderr=subprocess.DEVNULL).decode().strip()
            my_pid = str(os.getpid())
            for pid in out.split():
                if pid and pid != my_pid:
                    try:
                        os.kill(int(pid), 9)
                    except ProcessLookupError:
                        pass
        except Exception:
            pass

    print(f"🚀 Starting ExpensePilot Backend on http://{host}:{port} ...")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
