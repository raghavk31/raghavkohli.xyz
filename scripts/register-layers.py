"""
register-layers.py — fit a drawing exported at another scale / rotation / crop onto a stack frame.

    py scripts/register-layers.py <ref.jpg> <target.jpg> -o <out.jpg> [--over <prev.jpg>] [--check <chk.jpg>]

The site's `stack:` block needs every frame at one size, on one ground. When a drawing of the same
plan was exported differently (Water Urbanism's aahar-pyne and low-ground drawings sit 23.8° off
the plan frames, at 1.075x), this finds the similarity transform that lands the target's ink on the
reference's ink — SIFT on an ink mask, so colour differences between exports do not matter, and
RANSAC so the reference's extra content (context map, hatching) does not — and writes the target
warped into the reference's frame on white. Nothing is re-exported.

--over   multiply the result onto a previous frame, so the new frame contains it (stacks are cumulative).
--check  also write an overlay: reference ink in grey, warped target ink in red, to judge the fit.

Refuses a fit with fewer than 20 inliers. Needs opencv-python-headless + numpy (the `py` Python).
"""
import argparse, sys
import cv2, numpy as np

def ink(img, thr=235):
    return (cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) < thr).astype(np.uint8) * 255

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ref"); ap.add_argument("target"); ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--over"); ap.add_argument("--check"); ap.add_argument("--min-inliers", type=int, default=20)
    a = ap.parse_args()
    ref = cv2.imread(a.ref); tgt = cv2.imread(a.target)
    if ref is None or tgt is None: sys.exit("could not read the images")
    sift = cv2.SIFT_create(nfeatures=8000)
    kt, dt = sift.detectAndCompute(ink(tgt), None); kr, dr = sift.detectAndCompute(ink(ref), None)
    pairs = cv2.BFMatcher(cv2.NORM_L2).knnMatch(dt, dr, k=2)
    good = [m for m, n in pairs if m.distance < 0.75 * n.distance]
    if len(good) < 8: sys.exit(f"too few matches ({len(good)})")
    pt = np.float32([kt[m.queryIdx].pt for m in good]); pr = np.float32([kr[m.trainIdx].pt for m in good])
    M, inl = cv2.estimateAffinePartial2D(pt, pr, method=cv2.RANSAC, ransacReprojThreshold=4, maxIters=5000, confidence=0.995)
    n = 0 if inl is None else int(inl.sum())
    if M is None or n < a.min_inliers: sys.exit(f"no reliable fit ({n} inliers)")
    s = float(np.hypot(M[0, 0], M[0, 1])); rot = float(np.degrees(np.arctan2(M[0, 1], M[0, 0])))
    print(f"{a.target}: {len(good)} matches, {n} inliers, scale {s:.4f}, rotation {rot:.2f} deg, shift ({M[0,2]:.0f}, {M[1,2]:.0f})")
    H, W = ref.shape[:2]
    out = cv2.warpAffine(tgt, M, (W, H), flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
    # the export's near-white paper becomes white, so the warped rectangle's edge does not show
    g = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY); out[g >= 246] = 255
    if a.over:
        prev = cv2.imread(a.over)
        if prev is None or prev.shape != out.shape: sys.exit("--over frame missing or not the frame size")
        out = (out.astype(np.uint16) * prev.astype(np.uint16) // 255).astype(np.uint8)
    cv2.imwrite(a.out, out, [cv2.IMWRITE_JPEG_QUALITY, 88])
    if a.check:
        chk = np.full((H, W, 3), 255, np.uint8)
        chk[ink(ref) > 0] = (170, 170, 170); chk[ink(out) > 0] = (40, 40, 220)
        cv2.imwrite(a.check, chk, [cv2.IMWRITE_JPEG_QUALITY, 80])

if __name__ == "__main__":
    main()
