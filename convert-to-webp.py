"""
Otimizacao agressiva: redimensiona para max-width 800px e converte WebP qualidade 82.
"""
from PIL import Image
from pathlib import Path

base = Path(r"C:\Users\welbe\OneDrive\Documentos\landingnow")

# Imagens dos cases: largura final 800px (cards exibem em ~400-500px, 800px cobre Retina 2x)
cases = list((base / "cases").glob("*.png"))
# Imagem do founder: ja eh quadrada 1254px, reduzir pra 600px
founder = base / "welber.jpeg"

QUALITY = 82
total_before_png = sum(p.stat().st_size for p in cases) + founder.stat().st_size
total_after = 0

print(f"{'Arquivo':<28} {'Antes':>9} {'Depois':>9} {'Reducao':>8} {'Dims antes':>12} {'Dims dep.':>12}")
print("-" * 90)

# Processar cases (target width: 800)
TARGET_WIDTH_CASE = 800
for src in cases:
    img = Image.open(src)
    w0, h0 = img.size
    if w0 > TARGET_WIDTH_CASE:
        new_h = int(h0 * TARGET_WIDTH_CASE / w0)
        img = img.resize((TARGET_WIDTH_CASE, new_h), Image.LANCZOS)
    
    if img.mode == "RGBA":
        alpha = img.getchannel("A")
        if alpha.getextrema()[0] == 255:
            img = img.convert("RGB")
    
    dst = src.with_suffix(".webp")
    size_before = src.stat().st_size
    img.save(dst, format="WEBP", quality=QUALITY, method=6)
    size_after = dst.stat().st_size
    total_after += size_after
    reduction = (1 - size_after / size_before) * 100
    print(f"{src.name:<28} {size_before/1024:>7.1f}KB {size_after/1024:>7.1f}KB {reduction:>6.1f}% {f'{w0}x{h0}':>12} {f'{img.size[0]}x{img.size[1]}':>12}")

# Founder (target: 600x600)
TARGET_FOUNDER = 600
img = Image.open(founder)
w0, h0 = img.size
if w0 > TARGET_FOUNDER:
    img = img.resize((TARGET_FOUNDER, int(h0 * TARGET_FOUNDER / w0)), Image.LANCZOS)
dst = founder.with_suffix(".webp")
size_before = founder.stat().st_size
img.save(dst, format="WEBP", quality=QUALITY, method=6)
size_after = dst.stat().st_size
total_after += size_after
reduction = (1 - size_after / size_before) * 100
print(f"{founder.name:<28} {size_before/1024:>7.1f}KB {size_after/1024:>7.1f}KB {reduction:>6.1f}% {f'{w0}x{h0}':>12} {f'{img.size[0]}x{img.size[1]}':>12}")

print("-" * 90)
print(f"\nTOTAL antes (PNG+JPEG): {total_before_png/1024:.1f} KB ({total_before_png/1024/1024:.2f} MB)")
print(f"TOTAL depois (WebP):    {total_after/1024:.1f} KB ({total_after/1024/1024:.2f} MB)")
print(f"REDUCAO TOTAL:          {(1-total_after/total_before_png)*100:.1f}%")
print(f"ECONOMIA:               {(total_before_png-total_after)/1024:.1f} KB ({(total_before_png-total_after)/1024/1024:.2f} MB)")
