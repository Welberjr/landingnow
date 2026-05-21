"""
gen-og-namorados.py v2
Geracao com coracoes via equacao parametrica (forma correta)
e texto com acentos.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

ROOT = Path(__file__).parent
OUT = ROOT / 'og-image-namorados.png'

W, H = 1200, 630

# Cores
BG = (10, 10, 10)
INK = (250, 250, 250)
INK_SOFT = (184, 184, 184)
NEON = (200, 255, 61)
ROSE = (255, 77, 122)

FONTS_DIR = Path('C:/Windows/Fonts')
F_TITLE = ImageFont.truetype(str(FONTS_DIR / 'seguibl.ttf'), 78)
F_TITLE_SERIF = ImageFont.truetype(str(FONTS_DIR / 'georgiai.ttf'), 86)
F_LOGO = ImageFont.truetype(str(FONTS_DIR / 'segoeuib.ttf'), 32)
F_TAG = ImageFont.truetype(str(FONTS_DIR / 'seguisb.ttf'), 18)
F_TRUST = ImageFont.truetype(str(FONTS_DIR / 'segoeui.ttf'), 22)
F_TRUST_BOLD = ImageFont.truetype(str(FONTS_DIR / 'segoeuib.ttf'), 22)


def heart_points(cx, cy, size, samples=180):
    """Equacao parametrica de coracao. Retorna lista de pontos."""
    points = []
    scale = size / 34
    for i in range(samples):
        t = (i / samples) * 2 * math.pi
        # Forma classica
        x = 16 * (math.sin(t) ** 3)
        y = -(13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t))
        points.append((cx + x * scale, cy + y * scale))
    return points


def draw_heart(draw, cx, cy, size, color, fill=True, outline_width=3):
    pts = heart_points(cx, cy, size)
    if fill:
        draw.polygon(pts, fill=color)
    else:
        for i in range(len(pts)):
            j = (i + 1) % len(pts)
            draw.line([pts[i], pts[j]], fill=color, width=outline_width)


img = Image.new('RGB', (W, H), BG)

# ============================================================
# Glow rosa lateral (canto inferior esquerdo)
# ============================================================
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
for r, a in [(700, 22), (500, 36), (320, 55), (180, 80)]:
    gd.ellipse([(-r // 2, H - r), (r // 2 + r // 2, H + r // 4)], fill=(*ROSE, a))
glow = glow.filter(ImageFilter.GaussianBlur(radius=50))
img = Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')

# Glow rosa superior direito
glow2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
g2d = ImageDraw.Draw(glow2)
for r, a in [(520, 18), (340, 32), (210, 50)]:
    g2d.ellipse([(W - r // 3, -r // 2), (W + r, r // 2 + 60)], fill=(*ROSE, a))
glow2 = glow2.filter(ImageFilter.GaussianBlur(radius=45))
img = Image.alpha_composite(img.convert('RGBA'), glow2).convert('RGB')

draw = ImageDraw.Draw(img)

# ============================================================
# Logo
# ============================================================
logo_x, logo_y = 60, 56
logo_size = 48
draw.rounded_rectangle(
    [(logo_x, logo_y), (logo_x + logo_size, logo_y + logo_size)],
    radius=12, fill=NEON
)
# "L"
draw.line([(logo_x + 15, logo_y + 13), (logo_x + 15, logo_y + 33), (logo_x + 27, logo_y + 33)],
          fill=BG, width=4)
# Seta diagonal
draw.line([(logo_x + 25, logo_y + 24), (logo_x + 35, logo_y + 14)], fill=BG, width=3)
draw.line([(logo_x + 29, logo_y + 14), (logo_x + 35, logo_y + 14)], fill=BG, width=3)
draw.line([(logo_x + 35, logo_y + 14), (logo_x + 35, logo_y + 20)], fill=BG, width=3)

# Texto landingnow
draw.text((logo_x + logo_size + 14, logo_y + 10), 'landingnow', font=F_LOGO, fill=INK)
ln_w = draw.textlength('landingnow', font=F_LOGO)
draw.text((logo_x + logo_size + 14 + ln_w, logo_y + 10), '.', font=F_LOGO, fill=NEON)

# Coracao do logo (pequeno, ao lado)
heart_logo_x = logo_x + logo_size + 14 + ln_w + 32
heart_logo_y = logo_y + logo_size // 2 - 2
draw_heart(draw, heart_logo_x, heart_logo_y, 26, ROSE)

# ============================================================
# Tag rosa "Edicao Especial"
# ============================================================
tag_text = 'EDIÇÃO ESPECIAL DIA DOS NAMORADOS'
tag_y = 180
tag_x = 60
tag_padding_x = 42  # espaco pra coracao + texto
tag_w = int(draw.textlength(tag_text, font=F_TAG))
tag_box_x2 = tag_x + tag_padding_x + tag_w + 22
tag_box_y2 = tag_y + 40

draw.rounded_rectangle(
    [(tag_x, tag_y), (tag_box_x2, tag_box_y2)],
    radius=100, outline=ROSE, width=2, fill=(20, 8, 14)
)
draw_heart(draw, tag_x + 22, (tag_y + tag_box_y2) // 2, 16, ROSE)
draw.text((tag_x + tag_padding_x, tag_y + 11), tag_text, font=F_TAG, fill=ROSE)

# ============================================================
# Titulo
# ============================================================
# Linha 1
draw.text((60, 250), 'Sua página faz seus', font=F_TITLE, fill=INK)

# Linha 2: "clientes" (serif italic rosa) + " se " (sans branco) + "apaixonarem." (riscado)
clients_y = 348
clients_text = 'clientes'
# Glow rosa atras
shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.text((60, clients_y), clients_text, font=F_TITLE_SERIF, fill=(*ROSE, 110))
shadow = shadow.filter(ImageFilter.GaussianBlur(radius=10))
img = Image.alpha_composite(img.convert('RGBA'), shadow).convert('RGB')
draw = ImageDraw.Draw(img)
draw.text((60, clients_y), clients_text, font=F_TITLE_SERIF, fill=ROSE)
clients_w = draw.textlength(clients_text, font=F_TITLE_SERIF)

# " se "
se_x = 60 + clients_w + 18
se_y = clients_y + 6
draw.text((se_x, se_y), 'se', font=F_TITLE, fill=INK)
se_w = draw.textlength('se', font=F_TITLE)

# "apaixonarem."
apaix_x = se_x + se_w + 16
draw.text((apaix_x, se_y), 'apaixonarem.', font=F_TITLE, fill=INK)
apaix_w = draw.textlength('apaixonarem', font=F_TITLE)
strike_y = se_y + 50
draw.rectangle(
    [(apaix_x - 2, strike_y), (apaix_x + apaix_w + 4, strike_y + 6)],
    fill=ROSE
)

# ============================================================
# Coracoes decorativos (canto direito)
# ============================================================
# Coracao grande outlined no canto superior direito
draw_heart(draw, W - 130, 110, 100, ROSE, fill=False, outline_width=4)
# Coracao medio mais embaixo
draw_heart(draw, W - 200, 470, 70, ROSE, fill=False, outline_width=3)
# Coracao pequeno
draw_heart(draw, W - 90, 360, 45, ROSE, fill=False, outline_width=3)

# ============================================================
# Trust signal rodape
# ============================================================
trust_y = H - 60
draw_heart(draw, 76, trust_y + 13, 22, ROSE)
text_x = 100
draw.text((text_x, trust_y), 'Mais de ', font=F_TRUST, fill=INK_SOFT)
w1 = draw.textlength('Mais de ', font=F_TRUST)
draw.text((text_x + w1, trust_y), '70 marcas', font=F_TRUST_BOLD, fill=ROSE)
w2 = draw.textlength('70 marcas', font=F_TRUST_BOLD)
draw.text((text_x + w1 + w2, trust_y), ' já conquistaram resultados com a gente.', font=F_TRUST, fill=INK_SOFT)

img.save(OUT, 'PNG', optimize=True)
print(f'OK: {OUT.name} ({W}x{H}, {OUT.stat().st_size / 1024:.1f} KB)')
