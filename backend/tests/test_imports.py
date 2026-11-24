import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]


def test_main_se_importa_en_frio():
    r = subprocess.run(
        [sys.executable, "-I", "-c", f"import sys; sys.path.insert(0, {str(RAIZ)!r}); import backend.main"],
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr
