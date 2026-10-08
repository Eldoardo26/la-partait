from pathlib import Path
from PIL import Image
import numpy as np
import random


# ======================================================
# BOUNDING BOX
# Formato assunto: <classe> x_min y_min x_max y_max (pixel, una per riga)
# Se il tuo formato è <classe> x_center y_center width height,
# cambia SOLO parse_boxes e write_boxes.
# ======================================================

def parse_boxes(txt_path):
    boxes = []
    for line in txt_path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        cls = parts[0]
        x1, y1, x2, y2 = (float(v) for v in parts[1:5])
        boxes.append([cls, x1, y1, x2, y2])
    return boxes


def write_boxes(txt_path, boxes):
    lines = [
        f"{cls} {int(round(x1))} {int(round(y1))} "
        f"{int(round(x2))} {int(round(y2))}"
        for cls, x1, y1, x2, y2 in boxes
    ]
    txt_path.write_text("\n".join(lines) + ("\n" if lines else ""))


def transform_box(box, M, w, h):
    """Applica M (3x3, input->output) ai 4 angoli e restituisce l'AABB.

    Restituisce None se la box finisce (anche solo in parte) fuori
    dall'immagine [0,w]x[0,h] oppure degenera (area nulla).
    """
    x1, y1, x2, y2 = box[1:5]
    corners = np.array([
        [x1, y1, 1.0],
        [x2, y1, 1.0],
        [x2, y2, 1.0],
        [x1, y2, 1.0],
    ]).T
    new = M @ corners
    nx1, ny1 = new[0].min(), new[1].min()
    nx2, ny2 = new[0].max(), new[1].max()

    # controllo: box fuori dalla matrice
    if nx1 < 0 or ny1 < 0 or nx2 > w or ny2 > h:
        return None
    if nx2 - nx1 < 1 or ny2 - ny1 < 1:
        return None

    return [box[0], nx1, ny1, nx2, ny2]


# ======================================================
# MATRICI AFFINI (mappano input -> output)
# ======================================================

def _identity():
    return np.eye(3)


def _translation(dx, dy):
    return np.array([
        [1.0, 0.0, dx],
        [0.0, 1.0, dy],
        [0.0, 0.0, 1.0],
    ])


def _scale(z, w, h):
    cx, cy = w / 2.0, h / 2.0
    return np.array([
        [z, 0.0, cx * (1 - z)],
        [0.0, z, cy * (1 - z)],
        [0.0, 0.0, 1.0],
    ])


def _scale_x(f, w):
    cx = w / 2.0
    return np.array([
        [f, 0.0, cx * (1 - f)],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
    ])


def _scale_y(f, h):
    cy = h / 2.0
    return np.array([
        [1.0, 0.0, 0.0],
        [0.0, f, cy * (1 - f)],
        [0.0, 0.0, 1.0],
    ])


def _rotation(angle_deg, w, h):
    """Rotazione attorno al centro, convenzione PIL (antioraria)."""
    t = np.deg2rad(angle_deg)
    c, s = np.cos(t), np.sin(t)
    cx, cy = w / 2.0, h / 2.0
    return np.array([
        [c, s, cx - c * cx - s * cy],
        [-s, c, cy + s * cx - c * cy],
        [0.0, 0.0, 1.0],
    ])


# ======================================================
# HELPERS IMMAGINE
# ======================================================

def _noise_canvas(shape, mean, std):
    canvas = np.random.normal(mean, max(std, 1.0), shape)
    return np.clip(canvas, 0, 255).astype(np.uint8)


def _translate(img, dx, dy):
    """Trasla di (dx, dy) riempiendo i bordi di rumore (nessun wrap)."""
    h, w = img.shape[:2]
    canvas = _noise_canvas(img.shape, np.mean(img), np.std(img))
    sx0, sx1 = max(0, -dx), w - max(0, dx)
    sy0, sy1 = max(0, -dy), h - max(0, dy)
    dx0, dx1 = max(0, dx), max(0, dx) + (sx1 - sx0)
    dy0, dy1 = max(0, dy), max(0, dy) + (sy1 - sy0)
    canvas[dy0:dy1, dx0:dx1] = img[sy0:sy1, sx0:sx1]
    return canvas


# ======================================================
# AUGMENTATIONS ENERGETICHE (non toccano le box)
# ======================================================

def awgn(img, sigma_range=(4, 6)):
    sigma = random.uniform(*sigma_range)
    noise = np.random.normal(0, sigma, img.shape)
    out = img.astype(np.float32) + noise
    return np.clip(out, 0, 255).astype(np.uint8)


def gain_variation(img, gain_range=(0.85, 1.15)):
    gain = random.uniform(*gain_range)
    out = img.astype(np.float32) * gain
    return np.clip(out, 0, 255).astype(np.uint8)


def contrast_variation(img, alpha_range=(0.8, 1.2)):
    alpha = random.uniform(*alpha_range)
    mean = np.mean(img)
    out = (img.astype(np.float32) - mean) * alpha + mean
    return np.clip(out, 0, 255).astype(np.uint8)


# ======================================================
# AUGMENTATIONS GEOMETRICHE (restituiscono (img, matrice))
# ======================================================

def frequency_shift(img, max_shift=80):
    shift = random.randint(-max_shift, max_shift)
    return _translate(img, 0, shift), _translation(0, shift)


def time_shift(img, max_shift=80):
    shift = random.randint(-max_shift, max_shift)
    return _translate(img, shift, 0), _translation(shift, 0)


def random_zoom(img, zoom_range=(0.88, 1.15)):
    h, w = img.shape[:2]
    zoom = random.uniform(*zoom_range)
    nh, nw = int(h * zoom), int(w * zoom)
    resized = np.array(
        Image.fromarray(img).resize((nw, nh), Image.Resampling.NEAREST)
    )
    if zoom > 1:
        y0, x0 = (nh - h) // 2, (nw - w) // 2
        out = resized[y0:y0 + h, x0:x0 + w]
    else:
        canvas = _noise_canvas(img.shape, np.mean(img), np.std(img))
        y0, x0 = (h - nh) // 2, (w - nw) // 2
        canvas[y0:y0 + nh, x0:x0 + nw] = resized
        out = canvas
    return out, _scale(zoom, w, h)


def random_rotation(img, angle_range=(-5, 5)):
    h, w = img.shape[:2]
    angle = random.uniform(*angle_range)
    rotated = np.array(
        Image.fromarray(img).rotate(
            angle, resample=Image.Resampling.NEAREST, expand=False, fillcolor=0
        )
    )
    if len(rotated.shape) == 3:
        mask = np.all(rotated == 0, axis=2)
    else:
        mask = rotated == 0
    fill = _noise_canvas(rotated.shape, np.mean(img), np.std(img))
    rotated[mask] = fill[mask]
    return rotated, _rotation(angle, w, h)


def time_stretch(img, stretch_range=(0.45, 1.65)):
    h, w = img.shape[:2]
    factor = random.uniform(*stretch_range)
    new_w = max(1, int(w * factor))
    stretched = np.array(
        Image.fromarray(img).resize((new_w, h), Image.Resampling.BILINEAR)
    )
    if factor > 1:
        x0 = (new_w - w) // 2
        out = stretched[:, x0:x0 + w]
    else:
        canvas = _noise_canvas(img.shape, np.mean(img), np.std(img))
        x0 = (w - new_w) // 2
        canvas[:, x0:x0 + new_w] = stretched
        out = canvas
    return out, _scale_x(factor, w)


def frequency_stretch(img, stretch_range=(0.45, 1.65)):
    h, w = img.shape[:2]
    factor = random.uniform(*stretch_range)
    new_h = max(1, int(h * factor))
    stretched = np.array(
        Image.fromarray(img).resize((w, new_h), Image.Resampling.BILINEAR)
    )
    if factor > 1:
        y0 = (new_h - h) // 2
        out = stretched[y0:y0 + h, :]
    else:
        canvas = _noise_canvas(img.shape, np.mean(img), np.std(img))
        y0 = (h - new_h) // 2
        canvas[y0:y0 + new_h, :] = stretched
        out = canvas
    return out, _scale_y(factor, h)


# ======================================================
# PIPELINE
# ======================================================

def augment(img, boxes):
    """Applica le trasformazioni e restituisce (img, boxes, out_of_bounds).

    out_of_bounds = True se almeno una box è finita fuori dall'immagine:
    in tal caso l'immagine va scartata.
    """
    w, h = img.shape[1], img.shape[0]
    M = _identity()

    if random.random() < 0.7:
        img, m = time_stretch(img);      M = m @ M
    if random.random() < 0.7:
        img, m = frequency_stretch(img); M = m @ M
    if random.random() < 1.0:
        img, m = frequency_shift(img);   M = m @ M
    if random.random() < 1.0:
        img, m = time_shift(img);        M = m @ M

    if random.random() < 0.4:
        img = gain_variation(img)
    if random.random() < 0.5:
        img = contrast_variation(img)
    if random.random() < 0.5:
        img = awgn(img)

    if random.random() < 0.2:
        img, m = random_zoom(img);       M = m @ M
    if random.random() < 0.65:
        img, m = random_rotation(img);   M = m @ M

    new_boxes = []
    out_of_bounds = False
    for b in boxes:
        tb = transform_box(b, M, w, h)
        if tb is None:
            out_of_bounds = True
            break
        new_boxes.append(tb)

    return img, new_boxes, out_of_bounds


# ======================================================
# DATASET AUGMENTATION
# ======================================================

def augment_folder(input_dir, output_dir, n_aug=10):
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    images = [
        f for f in input_dir.rglob("*")
        if f.is_file() and f.suffix.lower() == ".png"
    ]
    print(f"Trovate {len(images)} immagini PNG")

    total_saved = 0
    total_discarded = 0

    for file in images:
        txt_file = file.with_suffix(".txt")
        if not txt_file.exists():
            print(f"Saltato {file.name}: manca {txt_file.name}")
            continue
        try:
            img = np.array(Image.open(file))
            boxes = parse_boxes(txt_file)
            if not boxes:
                print(f"Attenzione {file.name}: nessuna box in {txt_file.name}")

            for n in range(n_aug):
                aug, new_boxes, out_of_bounds = augment(img, boxes)
                if out_of_bounds:
                    total_discarded += 1
                    continue  # scarta questa immagine augmentata

                out_stem = f"{file.stem}_aug_{n}"
                Image.fromarray(aug).save(output_dir / f"{out_stem}.png")
                write_boxes(output_dir / f"{out_stem}.txt", new_boxes)
                total_saved += 1
        except Exception as e:
            print(f"Errore su {file.name}: {e}")

    print(
        f"Augmentation complete: {total_saved} salvate, "
        f"{total_discarded} scartate (box fuori matrice)"
    )
