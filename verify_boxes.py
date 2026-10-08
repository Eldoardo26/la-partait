from pathlib import Path
from PIL import Image, ImageDraw


# ======================================================
# Formato box: <classe> x_min y_min x_max y_max (pixel, una per riga)
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


def draw_boxes(img_path, txt_path, out_path, color=(255, 0, 0), width=3):
    """Disegna le bounding box (rettangolo rosso) sull'immagine."""
    img = Image.open(img_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    for cls, x1, y1, x2, y2 in parse_boxes(txt_path):
        draw.rectangle([x1, y1, x2, y2], outline=color, width=width)
        draw.text((x1, max(0, y1 - 12)), cls, fill=color)

    img.save(out_path)


def verify_image(img_path, out_path=None, color=(255, 0, 0), width=3):
    """Disegna le box sull'immagine usando il .txt con lo stesso nome.

    Se out_path non è dato, salva in <img_path>_checked.png.
    """
    img_path = Path(img_path)
    txt_path = img_path.with_suffix(".txt")
    if not txt_path.exists():
        print(f"Saltato {img_path.name}: manca {txt_path.name}")
        return False
    if out_path is None:
        out_path = img_path.with_name(f"{img_path.stem}_checked.png")
    draw_boxes(img_path, txt_path, Path(out_path), color=color, width=width)
    return True


def verify_folder(input_dir, output_dir=None):
    """Disegna le box su tutte le PNG della cartella (e sottocartelle)."""
    input_dir = Path(input_dir)
    if output_dir is None:
        output_dir = input_dir / "checked"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    images = [
        f for f in input_dir.rglob("*")
        if f.is_file() and f.suffix.lower() == ".png"
    ]
    print(f"Trovate {len(images)} immagini PNG")

    ok = 0
    for file in images:
        try:
            if verify_image(file, output_dir / f"{file.stem}_checked.png"):
                ok += 1
        except Exception as e:
            print(f"Errore su {file.name}: {e}")

    print(f"Fatto: {ok} immagini annotate in {output_dir}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso:")
        print("  python verify_boxes.py <cartella_input> [cartella_output]")
        print("  python verify_boxes.py <immagine.png> [immagine_output.png]")
        sys.exit(1)

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    if src.is_dir():
        verify_folder(src, dst)
    else:
        verify_image(src, dst)
