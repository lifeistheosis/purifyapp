# One picture for each reference: its parts in order, a few frames each, with a
# plain line over every part. Made to be read on a phone, one film at a time
# (his word, 2026-11-23: "send each one individually").
#
#   python3 -I -B docs/handoffs/promo-edits/map.py refs out   # out/map-<n>.jpg
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import probe, font
from strips import frames
from PIL import Image, ImageDraw

# (from, to, frames, columns, the line over them)
MAPS = {
    1: ("Video 1: @praisegrimm, 20 s", [
        (0.3, 2.0, 4, 4, "A. 0 to 2 s. One held picture and a question."),
        (2.1, 9.0, 12, 6, "B. 2 to 9 s. The run: about 25 faces, each smearing into the next."),
        (9.0, 11.0, 4, 4, "C. 9 to 11 s. Colour returns. Slow shots of the hero."),
        (11.2, 19.4, 8, 4, "D. 11 s to the end. The bass comes in. Dark and slow."),
    ]),
    2: ("Video 2: @jer.vfx, 16.5 s", [
        (0.0, 2.0, 4, 4, "A. 0 to 2 s. A cross in the hands, a man kneeling. All black and white."),
        (2.0, 3.7, 4, 4, "B. 2 to 4 s. A subject cut out on black, tiny words beside it."),
        (3.8, 12.0, 8, 4, "C. 4 to 12 s. A cut every 0.9 s, like a clock. Slow motion."),
        (12.0, 14.5, 4, 4, "D. 12 to 14 s. The fights."),
        (14.7, 16.4, 2, 4, "E. The end. Romans 15:13 in small type on black."),
    ]),
    3: ("Video 3: @gerginterx, 20 s", [
        (0.4, 2.4, 4, 4, "A. 0 to 2 s. A slit opens on His eyes. A tear falls."),
        (2.5, 3.5, 4, 4, "B. 2 to 3 s. The tear lands in water and the rings open into the crosses. No cut."),
        (4.0, 9.0, 8, 4, "C. 4 to 9 s. Paintings whose figures move: the Cross, the risen Christ, His face, the Ascension."),
        (9.1, 16.2, 8, 4, "D. 9 to 16 s. More paintings and slow pushes. 8 cuts in the whole film."),
        (16.6, 19.8, 4, 4, "E. The end. A glowing emblem, then the maker's name."),
    ]),
    4: ("Video 4: @jessie.prodz, 17 s", [
        (0.0, 2.0, 4, 4, "A. 0 to 2 s. A man at a window over the city at night."),
        (2.2, 4.5, 8, 4, "B. 2 to 4 s. The man and the drawn figure, pose for pose."),
        (4.6, 11.2, 8, 4, "C. 5 to 11 s. Hard black and white, red washes, black between the parts."),
        (11.2, 15.3, 8, 4, "D. 11 s: the drop. A white frame, then faster cuts to the end."),
    ]),
    5: ("Video 5: @0024nacho, 64 s", [
        (0.0, 4.0, 4, 4, "A. 0 to 4 s. A fast opening, unlike the rest."),
        (5.0, 15.0, 4, 4, "B. 5 to 15 s. Title cards on black, and single hits of sound."),
        (16.5, 41.0, 8, 4, "C. 16 s: the track comes in. Dark, fog, a soft glow, long slow shots."),
        (42.0, 60.0, 8, 4, "D. 42 to 60 s. The same mood to the end."),
        (60.4, 63.5, 2, 4, "E. The end. The maker's mark."),
    ]),
    6: ("Video 6: @kr1s.vfx, 18.5 s", [
        (0.0, 0.6, 4, 4, "A. 0 to 1 s. Big letters flick over the first photo."),
        (0.7, 4.8, 8, 4, "B. 1 to 5 s. Photos pushed in on, washed red, then blue. A white-bordered print."),
        (5.0, 13.3, 8, 4, "C. 5 to 13 s. A cut on each beat or half beat. A liquid smear between two photos."),
        (13.5, 18.3, 4, 4, "D. 13 s to the end. Five seconds fading to black, the maker's name."),
    ]),
}


def wrap(dr, text, f, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if dr.textlength(t, font=f) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    return lines + ([cur] if cur else [])


def make(root, n, out, W=1200):
    title, rows = MAPS[n]
    p = os.path.join(root, str(n), "v.mp4"); info = probe(p)
    ft, fl = font(44), font(34)
    probe_im = ImageDraw.Draw(Image.new("RGB", (W, 10)))
    built, H = [], 78
    for t0, t1, cnt, cols, label in rows:
        tw = W // cols; th = int(round(tw * info["h"] / info["w"]))
        step = max(1, int((t1 - t0) * info["fps"] / cnt))
        fr = frames(p, t0, t1, step, tw, th, info["fps"])[:cnt]
        lines = wrap(probe_im, label, fl, W - 24)
        nrows = -(-len(fr) // cols)
        built.append((lines, cols, tw, th, fr, nrows))
        H += 16 + len(lines) * 42 + 8 + nrows * th + 10
    im = Image.new("RGB", (W, H), (12, 12, 12)); dr = ImageDraw.Draw(im)
    dr.text((12, 14), title, fill=(255, 255, 255), font=ft); y = 78
    for lines, cols, tw, th, fr, nrows in built:
        y += 16
        for ln in lines:
            dr.text((12, y), ln, fill=(255, 225, 120), font=fl); y += 42
        y += 8
        for i, (_, a) in enumerate(fr):
            im.paste(Image.fromarray(a), ((i % cols) * tw, y + (i // cols) * th))
        y += nrows * th + 10
    im.save(out, quality=86)
    return im.size


if __name__ == "__main__":
    root, outdir = sys.argv[1], sys.argv[2]
    for n in sorted(MAPS):
        if os.path.exists(os.path.join(root, str(n), "v.mp4")):
            print(n, make(root, n, os.path.join(outdir, f"map-{n}.jpg")))
