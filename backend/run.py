import sys
import os
from pathlib import Path

<<<<<<< HEAD
# Fix Windows console UTF-8 encoding
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    os.environ["PYTHONIOENCODING"] = "utf-8"

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
=======
# Auto-switch to backend/.venv python if run with system/external python
backend_dir = Path(__file__).resolve().parent
venv_python = backend_dir / ".venv" / "bin" / "python"
if venv_python.exists() and sys.executable != str(venv_python):
    try:
        import uvicorn
    except ImportError:
        # Re-execute seamlessly inside the virtual environment
        os.execv(str(venv_python), [str(venv_python)] + sys.argv)

project_root = backend_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

os.environ["PYTHONPATH"] = str(project_root) + (os.pathsep + os.environ.get("PYTHONPATH", ""))

if __name__ == "__main__":
    import uvicorn
    import subprocess
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))

    # Auto-free port if an orphaned process is holding it
    if sys.platform != "win32":
        try:
            out = subprocess.check_output(["lsof", "-ti", f":{port}"], stderr=subprocess.DEVNULL).decode().strip()
            my_pid = str(os.getpid())
            killed_any = False
            for pid in out.split():
                if pid and pid != my_pid:
                    try:
                        os.kill(int(pid), 9)
                        killed_any = True
                    except Exception:
                        pass
            if killed_any:
                import time
                time.sleep(0.4)
        except Exception:
            pass

    print("\n" + "=" * 65)
    print(f"🚀 Starting Expense Pilot Backend (Meridian DEV-C04) on http://{host}:{port} ...")
    print(f"📚 Interactive Swagger API Docs : http://127.0.0.1:{port}/docs")
    print("=" * 65 + "\n")
    uvicorn.run(
        "backend.app.main:app",
        host=host,
        port=port,
        reload=True,
        app_dir=str(project_root)
    )
>>>>>>> f635bb06627205b2375f77f7e4a39d93b824da8f
