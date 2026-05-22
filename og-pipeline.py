"""
og-pipeline.py - LandingNow

Pipeline reutilizavel pra gerar as 12 og-images tematicas de qualquer cliente.

Como usar para um cliente novo:
1. Substitua a constante CLIENT no topo do arquivo
2. Rode: python og-pipeline.py
3. As 12 imagens og-image-<tema>.png saem na pasta do projeto

Como reaproveitar: cada cliente tem o mesmo motor de temas no site +
o mesmo middleware Vercel + estas 12 imagens proprias. Tempo de geracao: ~30s.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import random

# ============================================================
# CONFIG DO CLIENTE (mudar so isso pra atender outro cliente)
# ============================================================
CLIENT = {
    'name': 'landingnow',                       # nome em minusculo (logo)
    'brand_color': (200, 255, 61),              # cor primaria da marca (verde neon)
    'trust_number': '70',                       # numero pro trust signal
    'trust_text_after': 'já conquistaram resultados com a gente.',
    'out_dir': Path(__file__).parent,           # onde salvar as PNGs
}

# ============================================================
# CONSTANTES VISUAIS
# ============================================================
W, H = 1200, 630
BG = (10, 10, 10)
INK = (250, 250, 250)
INK_SOFT = (184, 184, 184)
WHITE = (255, 255, 255)

FONTS_DIR = Path('C:/Windows/Fonts')
F_TITLE      = ImageFont.truetype(str(FONTS_DIR / 'seguibl.ttf'), 78)
F_TITLE_SERIF = ImageFont.truetype(str(FONTS_DIR / 'georgiai.ttf'), 86)
F_LOGO       = ImageFont.truetype(str(FONTS_DIR / 'segoeuib.ttf'), 32)
F_TAG        = ImageFont.truetype(str(FONTS_DIR / 'seguisb.ttf'), 18)
F_TRUST      = ImageFont.truetype(str(FONTS_DIR / 'segoeui.ttf'), 22)
F_TRUST_BOLD = ImageFont.truetype(str(FONTS_DIR / 'segoeuib.ttf'), 22)

# ============================================================
# CONFIG DOS 12 TEMAS
# Cada tema define:
#   - accent: cor do tema (RGB tuple)
#   - tag: texto da pill superior
#   - title_pre: comeco da frase
#   - title_serif: palavra serif italic em destaque (cor do tema)
#   - title_connector: conector entre serif e strike
#   - title_strike: palavra final, riscada na cor do tema
#   - decoration: nome da funcao de decoracao do canto direito
# ============================================================
THEMES = {
    'namorados': {
        'accent': (255, 77, 122),
        'tag': 'EDIÇÃO ESPECIAL DIA DOS NAMORADOS',
        'title_pre': 'Sua página faz seus',
        'title_serif': 'clientes',
        'title_connector': 'se',
        'title_strike': 'apaixonarem.',
        'decoration': 'hearts',
    },
    'junina': {
        'accent': (255, 140, 0),
        'tag': 'EDIÇÃO ESPECIAL FESTA JUNINA',
        'title_pre': 'Sua página arrasta a',
        'title_serif': 'galera',
        'title_connector': 'pro',
        'title_strike': 'arraiá.',
        'decoration': 'bandeirinhas',
    },
    'maes': {
        'accent': (255, 105, 140),
        'tag': 'EDIÇÃO ESPECIAL DIA DAS MÃES',
        'title_pre': 'Sua página vende com',
        'title_serif': 'carinho',
        'title_connector': 'de',
        'title_strike': 'mãe.',
        'decoration': 'flowers',
    },
    'pais': {
        'accent': (52, 120, 200),
        'tag': 'EDIÇÃO ESPECIAL DIA DOS PAIS',
        'title_pre': 'Sua página vende com',
        'title_serif': 'firmeza',
        'title_connector': 'de',
        'title_strike': 'pai.',
        'decoration': 'mustache',
    },
    'natal': {
        'accent': (220, 38, 60),
        'accent_alt': (40, 180, 80),
        'tag': 'EDIÇÃO ESPECIAL NATAL',
        'title_pre': 'Sua página entrega o',
        'title_serif': 'presente',
        'title_connector': 'do',
        'title_strike': 'Natal.',
        'decoration': 'christmas',
    },
    'anonovo': {
        'accent': (255, 215, 0),
        'tag': 'EDIÇÃO ESPECIAL ANO NOVO',
        'title_pre': 'Sua página inicia o',
        'title_serif': 'ano',
        'title_connector': '',
        'title_strike': 'vendendo.',
        'decoration': 'fireworks',
    },
    'carnaval': {
        'accent': (255, 60, 130),
        'accent_alt': (60, 200, 230),
        'tag': 'EDIÇÃO ESPECIAL CARNAVAL',
        'title_pre': 'Sua página cai no',
        'title_serif': 'samba',
        'title_connector': 'dos',
        'title_strike': 'clientes.',
        'decoration': 'confetti',
    },
    'pascoa': {
        'accent': (180, 130, 240),
        'tag': 'EDIÇÃO ESPECIAL PÁSCOA',
        'title_pre': 'Sua página renasce em',
        'title_serif': 'conversão',
        'title_connector': '',
        'title_strike': 'doce.',
        'decoration': 'eggs',
    },
    'independencia': {
        'accent': (0, 156, 59),
        'accent_alt': (255, 223, 0),
        'tag': 'EDIÇÃO ESPECIAL SETE DE SETEMBRO',
        'title_pre': 'Sua página conquista o',
        'title_serif': 'Brasil',
        'title_connector': '',
        'title_strike': 'todo.',
        'decoration': 'flag_br',
    },
    'criancas': {
        'accent': (255, 195, 30),
        'accent_alt': (90, 200, 240),
        'tag': 'EDIÇÃO ESPECIAL DIA DAS CRIANÇAS',
        'title_pre': 'Sua página encanta a',
        'title_serif': 'criança',
        'title_connector': 'mais',
        'title_strike': 'exigente.',
        'decoration': 'balloons',
    },
    'halloween': {
        'accent': (255, 120, 30),
        'accent_alt': (140, 60, 200),
        'tag': 'EDIÇÃO ESPECIAL HALLOWEEN',
        'title_pre': 'Sua página assombra a',
        'title_serif': 'concorrência',
        'title_connector': '',
        'title_strike': 'inteira.',
        'decoration': 'pumpkin',
    },
    'blackfriday': {
        'accent': (255, 220, 0),
        'tag': 'EDIÇÃO ESPECIAL BLACK FRIDAY',
        'title_pre': 'Sua página vende',
        'title_serif': 'tudo',
        'title_connector': 'na',
        'title_strike': 'Black Friday.',
        'decoration': 'tag_lightning',
    },
}


# ============================================================
# UTILITIES
# ============================================================
def heart_points(cx, cy, size, samples=180):
    """Pontos da equacao parametrica de coracao."""
    points = []
    scale = size / 34
    for i in range(samples):
        t = (i / samples) * 2 * math.pi
        x = 16 * (math.sin(t) ** 3)
        y = -(13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t))
        points.append((cx + x * scale, cy + y * scale))
    return points


def draw_heart(draw, cx, cy, size, color, fill=True, width=3):
    pts = heart_points(cx, cy, size)
    if fill:
        draw.polygon(pts, fill=color)
    else:
        for i in range(len(pts)):
            j = (i + 1) % len(pts)
            draw.line([pts[i], pts[j]], fill=color, width=width)


def draw_star(draw, cx, cy, size, color, points=5):
    """Desenha estrela com N pontas."""
    pts = []
    for i in range(points * 2):
        t = (i / (points * 2)) * 2 * math.pi - math.pi / 2
        r = size if i % 2 == 0 else size * 0.4
        pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    draw.polygon(pts, fill=color)


def add_glow(img, cx, cy, radius, color, alpha_max=80, layers=4, blur=40):
    """Adiciona glow radial em uma posicao."""
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i, alpha in enumerate(range(alpha_max, 0, -(alpha_max // layers))):
        r = radius * (1 - i * 0.15)
        gd.ellipse(
            [(cx - r, cy - r), (cx + r, cy + r)],
            fill=(*color, alpha)
        )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=blur))
    return Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')


# ============================================================
# BASE: monta o esqueleto comum (background + logo + tag + title + trust)
# ============================================================
def draw_base(img, theme_cfg):
    """Desenha o conteudo comum a todos os temas."""
    accent = theme_cfg['accent']
    brand = CLIENT['brand_color']

    # Glow inferior esquerdo (cor do tema)
    img = add_glow(img, 100, H - 60, 600, accent, alpha_max=70, layers=4, blur=50)
    # Glow superior direito (cor do tema, mais sutil)
    img = add_glow(img, W - 40, 60, 480, accent, alpha_max=50, layers=3, blur=45)

    draw = ImageDraw.Draw(img)

    # --- LOGO ---
    logo_x, logo_y = 60, 56
    logo_size = 48
    draw.rounded_rectangle(
        [(logo_x, logo_y), (logo_x + logo_size, logo_y + logo_size)],
        radius=12, fill=brand
    )
    # "L" + seta
    draw.line([(logo_x + 15, logo_y + 13), (logo_x + 15, logo_y + 33), (logo_x + 27, logo_y + 33)],
              fill=BG, width=4)
    draw.line([(logo_x + 25, logo_y + 24), (logo_x + 35, logo_y + 14)], fill=BG, width=3)
    draw.line([(logo_x + 29, logo_y + 14), (logo_x + 35, logo_y + 14)], fill=BG, width=3)
    draw.line([(logo_x + 35, logo_y + 14), (logo_x + 35, logo_y + 20)], fill=BG, width=3)

    # nome + ponto
    draw.text((logo_x + logo_size + 14, logo_y + 10), CLIENT['name'], font=F_LOGO, fill=INK)
    ln_w = draw.textlength(CLIENT['name'], font=F_LOGO)
    draw.text((logo_x + logo_size + 14 + ln_w, logo_y + 10), '.', font=F_LOGO, fill=brand)

    # --- TAG ROSA/COR-DO-TEMA ---
    tag_text = theme_cfg['tag']
    tag_y = 180
    tag_x = 60
    tag_padding_x = 42
    tag_w = int(draw.textlength(tag_text, font=F_TAG))
    tag_box_x2 = tag_x + tag_padding_x + tag_w + 22
    tag_box_y2 = tag_y + 40

    # Fundo escurinho com toque da cor accent
    bg_tinted = tuple(min(255, c // 12 + 18) for c in accent)
    draw.rounded_rectangle(
        [(tag_x, tag_y), (tag_box_x2, tag_box_y2)],
        radius=100, outline=accent, width=2, fill=bg_tinted
    )
    # Pequeno indicador (coracao se for tema com coracao, senao estrela)
    if theme_cfg['decoration'] == 'hearts':
        draw_heart(draw, tag_x + 22, (tag_y + tag_box_y2) // 2, 16, accent)
    else:
        draw_star(draw, tag_x + 22, (tag_y + tag_box_y2) // 2 - 1, 9, accent, points=5)
    draw.text((tag_x + tag_padding_x, tag_y + 11), tag_text, font=F_TAG, fill=accent)

    # --- TITULO ---
    draw.text((60, 250), theme_cfg['title_pre'], font=F_TITLE, fill=INK)

    # Linha 2: serif (italic) + conector + strike
    y2 = 348
    serif_text = theme_cfg['title_serif']

    # Glow atras da palavra serif
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text((60, y2), serif_text, font=F_TITLE_SERIF, fill=(*accent, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=10))
    img = Image.alpha_composite(img.convert('RGBA'), shadow).convert('RGB')
    draw = ImageDraw.Draw(img)
    draw.text((60, y2), serif_text, font=F_TITLE_SERIF, fill=accent)
    serif_w = draw.textlength(serif_text, font=F_TITLE_SERIF)

    cx = 60 + serif_w + 18
    cy = y2 + 6
    if theme_cfg['title_connector']:
        draw.text((cx, cy), theme_cfg['title_connector'], font=F_TITLE, fill=INK)
        cw = draw.textlength(theme_cfg['title_connector'], font=F_TITLE)
        cx += cw + 16

    strike_text = theme_cfg['title_strike']
    draw.text((cx, cy), strike_text, font=F_TITLE, fill=INK)
    # Tira o ponto final do strike pra nao riscar o ponto
    strike_text_no_dot = strike_text.rstrip('.')
    strike_w = draw.textlength(strike_text_no_dot, font=F_TITLE)
    strike_y = cy + 50
    draw.rectangle(
        [(cx - 2, strike_y), (cx + strike_w + 4, strike_y + 6)],
        fill=accent
    )

    # --- TRUST SIGNAL ---
    trust_y = H - 60
    draw_heart(draw, 76, trust_y + 13, 22, accent)
    text_x = 100
    draw.text((text_x, trust_y), 'Mais de ', font=F_TRUST, fill=INK_SOFT)
    w1 = draw.textlength('Mais de ', font=F_TRUST)
    trust_num = CLIENT['trust_number'] + ' marcas'
    draw.text((text_x + w1, trust_y), trust_num, font=F_TRUST_BOLD, fill=accent)
    w2 = draw.textlength(trust_num, font=F_TRUST_BOLD)
    draw.text((text_x + w1 + w2, trust_y), ' ' + CLIENT['trust_text_after'],
              font=F_TRUST, fill=INK_SOFT)

    return img


# ============================================================
# DECORACOES - uma funcao por tema (canto direito)
# ============================================================
def decorate_hearts(img, draw, cfg):
    accent = cfg['accent']
    draw_heart(draw, W - 130, 110, 100, accent, fill=False, width=4)
    draw_heart(draw, W - 200, 470, 70, accent, fill=False, width=3)
    draw_heart(draw, W - 90, 360, 45, accent, fill=False, width=3)


def decorate_bandeirinhas(img, draw, cfg):
    """Bandeirinhas penduradas no topo."""
    colors = [(220, 60, 60), (255, 200, 30), (60, 160, 230), (60, 200, 100), (230, 90, 180)]
    # Linha (cordinha) curva
    rope_pts = []
    for i in range(50):
        t = i / 49
        x = W - 480 + t * 460
        y = 60 + 30 * math.sin(t * math.pi * 1.4) + 20 * (1 - t)
        rope_pts.append((x, y))
    for i in range(len(rope_pts) - 1):
        draw.line([rope_pts[i], rope_pts[i+1]], fill=cfg['accent'], width=2)
    # Bandeirinhas
    n_bandeiras = 7
    for i in range(n_bandeiras):
        idx = int((i / (n_bandeiras - 1)) * 49)
        x, y = rope_pts[idx]
        color = colors[i % len(colors)]
        size = 36
        # Triangulo apontando pra baixo
        draw.polygon([
            (x - size // 2, y),
            (x + size // 2, y),
            (x, y + size)
        ], fill=color)
    # Estrelinhas decorativas
    draw_star(draw, W - 110, 280, 14, cfg['accent'])
    draw_star(draw, W - 220, 380, 10, cfg['accent'])
    draw_star(draw, W - 90, 470, 12, cfg['accent'])


def decorate_flowers(img, draw, cfg):
    """Flores estilizadas (petalas + centro)."""
    accent = cfg['accent']
    accent_soft = tuple(min(255, c + 40) for c in accent)
    centro_amarelo = (255, 215, 100)

    def draw_flower(cx, cy, size):
        # 6 petalas (elipses ovais ao redor)
        petala_size = size
        for angle_deg in range(0, 360, 60):
            a = math.radians(angle_deg)
            px = cx + math.cos(a) * petala_size * 0.55
            py = cy + math.sin(a) * petala_size * 0.55
            r = petala_size * 0.45
            draw.ellipse([(px - r, py - r), (px + r, py + r)], fill=accent_soft)
        # Centro amarelo
        cr = size * 0.3
        draw.ellipse([(cx - cr, cy - cr), (cx + cr, cy + cr)], fill=centro_amarelo)

    draw_flower(W - 150, 140, 70)
    draw_flower(W - 100, 320, 50)
    draw_flower(W - 200, 460, 65)
    # Folhinhas
    draw.polygon([(W - 160, 200), (W - 180, 220), (W - 140, 220)], fill=(80, 180, 100))


def decorate_mustache(img, draw, cfg):
    """Camisa social abotoada com gravata + estrelas (Dia dos Pais)."""
    accent = cfg['accent']
    shirt_white = (235, 240, 248)
    shirt_shadow = (200, 208, 220)

    # Centro da composicao
    cx = W - 130

    # Camisa: forma de gola em V + ombros
    # Gola (forma de V invertido com pontas)
    collar_top_y = 150
    collar_pts = [
        (cx - 100, collar_top_y),       # ombro esquerdo
        (cx - 40, collar_top_y),        # gola esquerda topo
        (cx, collar_top_y + 60),        # ponta do V
        (cx + 40, collar_top_y),        # gola direita topo
        (cx + 100, collar_top_y),       # ombro direito
        (cx + 130, collar_top_y + 30),  # ombro direito desce
        (cx + 130, H - 110),            # lateral direita
        (cx - 130, H - 110),            # lateral esquerda
        (cx - 130, collar_top_y + 30),  # ombro esquerdo desce
    ]
    draw.polygon(collar_pts, fill=shirt_white)

    # Detalhe da gola (sombra interna do V)
    draw.polygon([
        (cx - 40, collar_top_y),
        (cx - 25, collar_top_y),
        (cx, collar_top_y + 45),
        (cx + 25, collar_top_y),
        (cx + 40, collar_top_y),
        (cx, collar_top_y + 60)
    ], fill=shirt_shadow)

    # Botoes
    for i in range(3):
        bx = cx
        by = collar_top_y + 110 + i * 70
        draw.ellipse([(bx - 6, by - 6), (bx + 6, by + 6)], fill=shirt_shadow)

    # Gravata no centro
    tie_top_y = collar_top_y + 60
    # No
    draw.polygon([
        (cx - 22, tie_top_y - 5), (cx + 22, tie_top_y - 5),
        (cx + 28, tie_top_y + 25), (cx - 28, tie_top_y + 25)
    ], fill=tuple(max(0, c - 50) for c in accent))
    # Corpo
    draw.polygon([
        (cx - 28, tie_top_y + 25),
        (cx + 28, tie_top_y + 25),
        (cx + 40, tie_top_y + 90),
        (cx + 30, tie_top_y + 160),
        (cx, tie_top_y + 200),
        (cx - 30, tie_top_y + 160),
        (cx - 40, tie_top_y + 90),
    ], fill=accent)
    # Reflexo (linha mais clara)
    draw.line([
        (cx - 8, tie_top_y + 40), (cx - 4, tie_top_y + 180)
    ], fill=tuple(min(255, c + 50) for c in accent), width=3)

    # Estrelinhas decorativas
    draw_star(draw, W - 100, 100, 14, accent)
    draw_star(draw, W - 320, 220, 11, accent)
    draw_star(draw, W - 80, 480, 13, accent)


def decorate_christmas(img, draw, cfg):
    """Arvore + estrela + flocos de neve."""
    accent = cfg['accent']
    green = cfg.get('accent_alt', (40, 180, 80))
    # Arvore (3 triangulos sobrepostos)
    cx = W - 180
    base_y = 460
    tier_h = 90
    for i, w in enumerate([170, 140, 110]):
        y_top = base_y - tier_h - i * 70
        y_bot = y_top + tier_h + 20
        draw.polygon([
            (cx, y_top),
            (cx - w // 2, y_bot),
            (cx + w // 2, y_bot)
        ], fill=green)
    # Tronco
    draw.rectangle([(cx - 18, base_y - 20), (cx + 18, base_y + 20)], fill=(110, 70, 40))
    # Estrela no topo
    draw_star(draw, cx, base_y - tier_h - 2 * 70 - 30, 22, accent, points=5)
    # Flocos de neve (X simples)
    def snowflake(x, y, size):
        draw.line([(x - size, y), (x + size, y)], fill=INK, width=2)
        draw.line([(x, y - size), (x, y + size)], fill=INK, width=2)
        s2 = size * 0.7
        draw.line([(x - s2, y - s2), (x + s2, y + s2)], fill=INK, width=2)
        draw.line([(x - s2, y + s2), (x + s2, y - s2)], fill=INK, width=2)

    for sx, sy, ss in [(W - 90, 130, 12), (W - 270, 200, 8), (W - 80, 300, 10), (W - 250, 420, 9), (W - 120, 480, 11)]:
        snowflake(sx, sy, ss)


def decorate_fireworks(img, draw, cfg):
    """Fogos de artificio (linhas radiais)."""
    accent = cfg['accent']
    accent_soft = (255, 100, 100)
    accent_alt = (90, 200, 240)

    def firework(cx, cy, radius, color, rays=12, lw=2):
        for i in range(rays):
            a = (i / rays) * 2 * math.pi
            r_inner = radius * 0.25
            r_outer = radius * (0.8 + random.random() * 0.2)
            x1 = cx + r_inner * math.cos(a)
            y1 = cy + r_inner * math.sin(a)
            x2 = cx + r_outer * math.cos(a)
            y2 = cy + r_outer * math.sin(a)
            draw.line([(x1, y1), (x2, y2)], fill=color, width=lw)
        # Centro brilhante
        cr = 6
        draw.ellipse([(cx - cr, cy - cr), (cx + cr, cy + cr)], fill=color)

    random.seed(42)
    firework(W - 200, 140, 90, accent, rays=14, lw=3)
    firework(W - 110, 260, 60, accent_soft, rays=10, lw=2)
    firework(W - 230, 380, 75, accent_alt, rays=12, lw=2)
    firework(W - 100, 470, 55, accent, rays=10, lw=2)
    # Taca de espumante
    tx, ty = W - 380, 480
    draw.polygon([
        (tx - 35, ty - 90), (tx + 35, ty - 90),
        (tx + 20, ty - 30), (tx - 20, ty - 30)
    ], fill=INK)
    draw.rectangle([(tx - 3, ty - 30), (tx + 3, ty + 20)], fill=INK)
    draw.rectangle([(tx - 30, ty + 20), (tx + 30, ty + 25)], fill=INK)
    # Liquido dourado
    draw.polygon([
        (tx - 30, ty - 78), (tx + 30, ty - 78),
        (tx + 18, ty - 35), (tx - 18, ty - 35)
    ], fill=accent)


def decorate_confetti(img, draw, cfg):
    """Mascara de carnaval + confetes."""
    accent = cfg['accent']
    accent_alt = cfg.get('accent_alt', (60, 200, 230))
    yellow = (255, 215, 0)
    green = (60, 200, 100)

    # Mascara veneziana (forma de borboleta com olhos)
    mx, my = W - 200, 200
    # Forma da mascara (polygon estilizado)
    mask_pts = [
        (mx - 140, my - 35),    # ponta superior esquerda
        (mx - 90, my - 45),
        (mx - 30, my - 35),
        (mx, my - 28),          # centro topo
        (mx + 30, my - 35),
        (mx + 90, my - 45),
        (mx + 140, my - 35),    # ponta superior direita
        (mx + 130, my + 5),
        (mx + 90, my + 35),     # ponta inferior direita
        (mx + 30, my + 30),
        (mx, my + 18),          # centro embaixo
        (mx - 30, my + 30),
        (mx - 90, my + 35),     # ponta inferior esquerda
        (mx - 130, my + 5),
    ]
    draw.polygon(mask_pts, fill=accent)
    # Olhos (almond shaped)
    draw.polygon([
        (mx - 95, my - 5), (mx - 70, my - 18), (mx - 45, my - 5),
        (mx - 70, my + 8)
    ], fill=BG)
    draw.polygon([
        (mx + 45, my - 5), (mx + 70, my - 18), (mx + 95, my - 5),
        (mx + 70, my + 8)
    ], fill=BG)
    # Plumas/penachos no topo
    for px in [mx - 70, mx, mx + 70]:
        for dy, color in [(0, accent_alt), (-15, yellow), (-25, green)]:
            draw.line([(px, my - 30), (px - 5 + (mx - px) * 0.05, my - 60 + dy)],
                      fill=color, width=3)

    # Confetes espalhados (formas variadas)
    random.seed(7)
    colors = [accent, accent_alt, yellow, green, (255, 100, 50), (130, 80, 220)]
    for _ in range(28):
        cx = W - 380 + random.randint(0, 380)
        cy = 80 + random.randint(0, 470)
        # nao sobrepor a mascara
        if abs(cx - mx) < 130 and abs(cy - my) < 60:
            continue
        c = random.choice(colors)
        kind = random.choice(['circle', 'rect', 'triangle'])
        s = random.randint(6, 14)
        if kind == 'circle':
            draw.ellipse([(cx - s, cy - s), (cx + s, cy + s)], fill=c)
        elif kind == 'rect':
            draw.rectangle([(cx - s, cy - s // 2), (cx + s, cy + s // 2)], fill=c)
        else:
            draw.polygon([(cx, cy - s), (cx - s, cy + s), (cx + s, cy + s)], fill=c)


def decorate_eggs(img, draw, cfg):
    """Ovos de pascoa decorados."""
    accent = cfg['accent']
    pastel1 = (255, 180, 220)
    pastel2 = (160, 230, 220)
    pastel3 = (255, 215, 130)

    def draw_egg(cx, cy, size, color, pattern_color):
        # Forma de ovo (elipse esticada com topo mais fino)
        draw.ellipse([(cx - size * 0.55, cy - size), (cx + size * 0.55, cy + size)], fill=color)
        # Padrao: 3 listras horizontais
        for offset in [-size * 0.3, 0, size * 0.3]:
            draw.line([(cx - size * 0.5, cy + offset), (cx + size * 0.5, cy + offset)],
                      fill=pattern_color, width=4)
        # Bolinhas
        for px, py in [(cx - 8, cy - size * 0.5), (cx + 6, cy - size * 0.15), (cx - 4, cy + size * 0.4)]:
            draw.ellipse([(px - 4, py - 4), (px + 4, py + 4)], fill=pattern_color)

    draw_egg(W - 200, 200, 75, pastel1, accent)
    draw_egg(W - 100, 350, 60, pastel2, (60, 160, 180))
    draw_egg(W - 230, 460, 70, pastel3, (200, 130, 60))


def decorate_flag_br(img, draw, cfg):
    """Bandeira do Brasil estilizada."""
    green = cfg['accent']
    yellow = cfg.get('accent_alt', (255, 223, 0))
    blue = (1, 60, 138)
    # Retangulo verde
    rx, ry = W - 250, 140
    rw, rh = 220, 160
    draw.rectangle([(rx, ry), (rx + rw, ry + rh)], fill=green)
    # Losango amarelo
    cx, cy = rx + rw // 2, ry + rh // 2
    draw.polygon([
        (cx, ry + 18), (rx + rw - 28, cy),
        (cx, ry + rh - 18), (rx + 28, cy)
    ], fill=yellow)
    # Circulo azul central
    rr = 56
    draw.ellipse([(cx - rr, cy - rr), (cx + rr, cy + rr)], fill=blue)
    # Estrelinhas dentro do circulo
    for sx, sy in [(cx - 20, cy - 12), (cx + 15, cy - 18), (cx + 22, cy + 10), (cx - 10, cy + 18), (cx, cy)]:
        draw_star(draw, sx, sy, 4, INK, points=5)
    # Faixa branca (simplificada como linha)
    draw.line([(cx - 40, cy + 4), (cx + 40, cy + 4)], fill=INK, width=2)
    # Estrelinhas decorativas adicionais
    draw_star(draw, W - 100, 420, 16, yellow, points=5)
    draw_star(draw, W - 220, 480, 12, green, points=5)


def decorate_balloons(img, draw, cfg):
    """Baloes coloridos com cordinha."""
    colors = [(255, 85, 100), (90, 200, 240), (255, 200, 30), (140, 220, 100), (200, 130, 240)]
    random.seed(11)
    positions = [(W - 200, 140, 65), (W - 100, 220, 50), (W - 280, 280, 60), (W - 150, 380, 55), (W - 90, 470, 48)]
    for i, (cx, cy, size) in enumerate(positions):
        color = colors[i]
        # Balao (elipse)
        draw.ellipse([(cx - size * 0.7, cy - size), (cx + size * 0.7, cy + size * 0.5)], fill=color)
        # Triangulo abaixo (no)
        draw.polygon([
            (cx - 6, cy + size * 0.5),
            (cx + 6, cy + size * 0.5),
            (cx, cy + size * 0.65)
        ], fill=color)
        # Cordinha
        cord_pts = []
        for j in range(20):
            t = j / 19
            x = cx + 8 * math.sin(t * math.pi * 2)
            y = cy + size * 0.65 + t * 80
            cord_pts.append((x, y))
        for j in range(len(cord_pts) - 1):
            draw.line([cord_pts[j], cord_pts[j+1]], fill=INK_SOFT, width=2)


def decorate_pumpkin(img, draw, cfg):
    """Abobora + lua + teia."""
    accent = cfg['accent']
    purple = cfg.get('accent_alt', (140, 60, 200))
    # Lua
    mx, my = W - 100, 130
    draw.ellipse([(mx - 40, my - 40), (mx + 40, my + 40)], fill=(255, 230, 150))
    # Recorta com BG circulo deslocado pra fazer crescente
    draw.ellipse([(mx + 10, my - 40), (mx + 90, my + 40)], fill=BG)

    # Abobora
    cx, cy = W - 140, 360
    sz = 95
    # Tres "gomos"
    draw.ellipse([(cx - sz, cy - sz * 0.7), (cx, cy + sz * 0.7)], fill=accent)
    draw.ellipse([(cx, cy - sz * 0.7), (cx + sz, cy + sz * 0.7)], fill=accent)
    draw.ellipse([(cx - sz * 0.6, cy - sz * 0.75), (cx + sz * 0.6, cy + sz * 0.75)],
                 fill=tuple(min(255, c + 25) for c in accent))
    # Cabinho verde
    draw.rectangle([(cx - 8, cy - sz * 0.75 - 22), (cx + 8, cy - sz * 0.75)], fill=(80, 120, 50))
    # Olhos triangulares
    draw.polygon([(cx - 35, cy - 15), (cx - 18, cy - 15), (cx - 26, cy + 5)], fill=BG)
    draw.polygon([(cx + 18, cy - 15), (cx + 35, cy - 15), (cx + 26, cy + 5)], fill=BG)
    # Boca zig-zag
    mouth_pts = [(cx - 40, cy + 30), (cx - 25, cy + 18), (cx - 10, cy + 32), (cx + 5, cy + 18),
                 (cx + 20, cy + 32), (cx + 35, cy + 18), (cx + 40, cy + 32)]
    draw.polygon(mouth_pts + [(cx + 40, cy + 50), (cx - 40, cy + 50)], fill=BG)

    # Teia de aranha (canto)
    wx, wy = W - 80, 510
    for ang in range(0, 360, 45):
        a = math.radians(ang)
        draw.line([(wx, wy), (wx + 70 * math.cos(a), wy + 70 * math.sin(a))],
                  fill=purple, width=2)
    for radius in [25, 45, 65]:
        ring_pts = []
        for ang in range(0, 360, 45):
            a = math.radians(ang)
            ring_pts.append((wx + radius * math.cos(a), wy + radius * math.sin(a)))
        for i in range(len(ring_pts) - 1):
            draw.line([ring_pts[i], ring_pts[i+1]], fill=purple, width=2)
        draw.line([ring_pts[-1], ring_pts[0]], fill=purple, width=2)


def decorate_tag_lightning(img, draw, cfg):
    """Etiqueta de desconto + raios."""
    accent = cfg['accent']
    # Etiqueta principal
    tx, ty = W - 280, 180
    tw, th = 220, 130
    # Forma de tag (retangulo com canto recortado)
    pts = [
        (tx, ty), (tx + tw, ty),
        (tx + tw, ty + th),
        (tx + 40, ty + th),
        (tx, ty + th - 40)
    ]
    draw.polygon(pts, fill=accent)
    # Furo
    draw.ellipse([(tx + 25, ty + th - 25), (tx + 45, ty + th - 5)], fill=BG)
    # Texto "%" gigante
    f_pct = ImageFont.truetype(str(FONTS_DIR / 'seguibl.ttf'), 80)
    draw.text((tx + 70, ty + 18), '%', font=f_pct, fill=BG)
    # Raios decorativos
    def lightning(x, y, size, color):
        pts = [
            (x, y), (x - size * 0.3, y + size * 0.5),
            (x, y + size * 0.5), (x - size * 0.2, y + size),
            (x + size * 0.3, y + size * 0.45),
            (x, y + size * 0.45), (x + size * 0.2, y)
        ]
        draw.polygon(pts, fill=color)

    lightning(W - 80, 50, 60, accent)
    lightning(W - 200, 450, 60, accent)
    lightning(W - 60, 470, 70, accent)
    # Pequenas estrelas
    draw_star(draw, W - 220, 480, 12, accent)
    draw_star(draw, W - 60, 250, 10, accent)


DECORATORS = {
    'hearts': decorate_hearts,
    'bandeirinhas': decorate_bandeirinhas,
    'flowers': decorate_flowers,
    'mustache': decorate_mustache,
    'christmas': decorate_christmas,
    'fireworks': decorate_fireworks,
    'confetti': decorate_confetti,
    'eggs': decorate_eggs,
    'flag_br': decorate_flag_br,
    'balloons': decorate_balloons,
    'pumpkin': decorate_pumpkin,
    'tag_lightning': decorate_tag_lightning,
}


# ============================================================
# MAIN: gera uma og-image
# ============================================================
def generate_og(slug):
    cfg = THEMES[slug]
    img = Image.new('RGB', (W, H), BG)
    img = draw_base(img, cfg)
    draw = ImageDraw.Draw(img)
    decorator = DECORATORS.get(cfg['decoration'])
    if decorator:
        decorator(img, draw, cfg)
    out = CLIENT['out_dir'] / f'og-image-{slug}.png'
    img.save(out, 'PNG', optimize=True)
    return out


if __name__ == '__main__':
    print(f'Gerando 12 og-images pra {CLIENT["name"]}...')
    for slug in THEMES:
        out = generate_og(slug)
        size_kb = out.stat().st_size / 1024
        print(f'  OK {out.name} ({size_kb:.1f} KB)')
    print('Concluido.')
