import sys
import os
from pathlib import Path

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
    print("\n" + "=" * 65)
    print("🚀 Starting Expense Pilot Backend (Meridian DEV-C04) on http://127.0.0.1:8000 ...")
    print("=" * 65 + "\n")
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir=str(project_root)
    )
