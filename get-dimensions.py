from PIL import Image
from pathlib import Path
base = Path(r"C:\Users\welbe\OneDrive\Documentos\landingnow")
imgs = sorted(list((base/"cases").glob("*.webp"))) + [base/"welber.webp"]
for p in imgs:
    if p.exists():
        w, h = Image.open(p).size
        print(f"{p.name:<30} {w}x{h}")
