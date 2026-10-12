"""Make an animation of the work from a sequence of stills (2026-10-12).

Each still holds, then cross-fades into the next; the last fades back into the first, so the loop has
no seam. Every still is centred on one canvas (the largest width and height in the set) on white, the
way the drawings sit on their paper. Writes <out>.mp4 (H.264, silent, fast-start) and <out>.jpg, the
poster: the first still, which is also what a reader with reduced motion sees.

    python scripts/make-anim.py src/assets/projects/generative-techniques/anim-horizons \
        src/assets/projects/generative-techniques/03.jpg 04.jpg 05.jpg --hold 1.8 --fade .9

A bare file name after the first path is read from the first path's folder. Prints the frontmatter
for the beat: `{ src: ....mp4, poster: ....jpg, w:, h: }`. Needs ffmpeg on the PATH.
"""
import argparse, os, subprocess, sys

from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", help="output path without extension")
    ap.add_argument("stills", nargs="+")
    ap.add_argument("--hold", type=float, default=1.8, help="seconds each still holds")
    ap.add_argument("--fade", type=float, default=0.9, help="seconds of each cross-fade")
    ap.add_argument("--width", type=int, default=1400, help="the canvas is scaled to at most this wide")
    ap.add_argument("--fps", type=int, default=25)
    ap.add_argument("--bg", default="white")
    a = ap.parse_args()

    base = os.path.dirname(a.stills[0])
    paths = [p if os.path.dirname(p) else os.path.join(base, p) for p in a.stills]
    if len(paths) < 2:
        sys.exit("need two stills or more")
    sizes = [Image.open(p).size for p in paths]
    W, H = max(w for w, _ in sizes), max(h for _, h in sizes)
    k = min(1, a.width / W)
    W, H = int(W * k) // 2 * 2, int(H * k) // 2 * 2   # H.264 wants even sides

    # one input per still, each looped long enough to hold and fade on both sides
    seg = a.hold + a.fade
    seq = paths + [paths[0]]   # back to the first: the loop closes on itself
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    for p in seq:
        cmd += ["-loop", "1", "-t", f"{seg + a.fade:.3f}", "-i", p]
    f = []
    for i in range(len(seq)):
        f.append(f"[{i}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
                 f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={a.bg},setsar=1,fps={a.fps},format=yuv420p[v{i}]")
    # still i fades in from i·(hold+fade) − fade; the film ends as the last fade (back into the first
    # still) completes, so a loop restarts on exactly the frame it ended on
    last = "v0"
    for i in range(1, len(seq)):
        f.append(f"[{last}][v{i}]xfade=transition=fade:duration={a.fade}:offset={i * seg - a.fade:.3f}[x{i}]")
        last = f"x{i}"
    total = (len(seq) - 1) * seg
    cmd += ["-filter_complex", ";".join(f), "-map", f"[{last}]", "-t", f"{total:.3f}",
            "-c:v", "libx264", "-preset", "slow", "-tune", "stillimage", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
            a.out + ".mp4"]
    subprocess.run(cmd, check=True)

    im = Image.new("RGB", (W, H), a.bg)
    s = Image.open(paths[0]).convert("RGB")
    s.thumbnail((W, H), Image.LANCZOS)
    im.paste(s, ((W - s.width) // 2, (H - s.height) // 2))
    im.save(a.out + ".jpg", quality=85, optimize=True, progressive=True)

    web = lambda p: "/" + os.path.relpath(p, "src").replace(os.sep, "/")
    kb = os.path.getsize(a.out + ".mp4") // 1024
    print(f"{{ src: {web(a.out + '.mp4')}, poster: {web(a.out + '.jpg')}, w: {W}, h: {H} }}   # {kb} KB")


if __name__ == "__main__":
    main()
