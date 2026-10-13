"""
sync-climate-code.py — bring the Climate Code atlas from the climate-30 repo into the site.

    python scripts/sync-climate-code.py [path/to/climate-30]      (default: D:/work/dev/climate-30)

The sixteen tools live in raghavk31/resilience-stack (climate-30) as Streamlit apps; this site cannot
run them, so explorer/build_atlas.py there does their country-level work ahead of time. Run that first
(`py -3.13 explorer/build_atlas.py`), then this. It copies explorer/dist/atlas.json and
countries.geojson to src/assets/climate-code/data/, where /work/climate-code/ loads them, and writes
SOURCE.txt with the climate-30 commit the files came from, so a stale copy is visible in the diff.
"""
import shutil
import subprocess
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
LAB = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("D:/work/dev/climate-30")
FILES = ["atlas.json", "countries.geojson"]


def main() -> None:
    src = LAB / "explorer" / "dist"
    missing = [f for f in FILES if not (src / f).exists()]
    if missing:
        sys.exit(f"missing in {src}: {', '.join(missing)} — run `py -3.13 explorer/build_atlas.py` in {LAB} first")
    dst = SITE / "src" / "assets" / "climate-code" / "data"
    dst.mkdir(parents=True, exist_ok=True)
    for f in FILES:
        shutil.copy2(src / f, dst / f)
        print(f"  {f:18} {(dst / f).stat().st_size / 1e3:7.0f} KB")
    rev = subprocess.run(["git", "-C", str(LAB), "log", "-1", "--format=%h %cs %s"],
                         capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(["git", "-C", str(LAB), "status", "--porcelain", "explorer"],
                           capture_output=True, text=True).stdout.strip()
    (dst / "SOURCE.txt").write_text(
        f"raghavk31/resilience-stack {rev}{' (+ uncommitted changes)' if dirty else ''}\n"
        "Built files. Do not edit here: change climate-30, rerun explorer/build_atlas.py, "
        "then scripts/sync-climate-code.py.\n",
        encoding="utf-8")
    print(f"synced from climate-30 {rev}{' + uncommitted changes' if dirty else ''}")


if __name__ == "__main__":
    main()
