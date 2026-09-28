"""
sync-sama-lab.py — bring Sama's instruments from the sama-lab repo into the site.

    python scripts/sync-sama-lab.py [path/to/sama-lab]      (default: ~/dev/sama-lab)

The model, its sweep and the essay's code live in raghavk31/sama-lab; this site only serves them.
Run `npm run build` in sama-lab first, then this. It copies the embeddable build
(dist/embed/sama-abm.js, sama-abm.css, results.json) to src/assets/sama-lab/abm/, where
src/sama-feeder.njk (/work/sama/feeder/) loads it, and writes SOURCE.txt with the sama-lab commit
the files came from, so a stale copy is visible in the diff.
"""
import shutil
import subprocess
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
LAB = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "dev" / "sama-lab"
FILES = ["sama-abm.js", "sama-abm.css", "results.json"]


def main() -> None:
    src = LAB / "dist" / "embed"
    missing = [f for f in FILES if not (src / f).exists()]
    if missing:
        sys.exit(f"missing in {src}: {', '.join(missing)} — run `npm run build` in {LAB} first")
    dst = SITE / "src" / "assets" / "sama-lab" / "abm"
    dst.mkdir(parents=True, exist_ok=True)
    for f in FILES:
        shutil.copy2(src / f, dst / f)
        print(f"  {f:14} {(dst / f).stat().st_size / 1e3:7.0f} KB")
    rev = subprocess.run(["git", "-C", str(LAB), "log", "-1", "--format=%h %cs %s"],
                         capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(["git", "-C", str(LAB), "status", "--porcelain"],
                           capture_output=True, text=True).stdout.strip()
    (dst / "SOURCE.txt").write_text(
        f"raghavk31/sama-lab {rev}{' (+ uncommitted changes)' if dirty else ''}\n"
        "Built files. Do not edit here: change sama-lab, rebuild, and rerun scripts/sync-sama-lab.py.\n",
        encoding="utf-8")
    print(f"synced from sama-lab {rev}{' + uncommitted changes' if dirty else ''}")


if __name__ == "__main__":
    main()
