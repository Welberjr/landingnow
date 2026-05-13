"""
Aplica todas as otimizacoes PSI no index.html:
1. Substitui PNG/JPEG por WebP com width/height/loading/decoding
2. Adiciona <main> wrapper para acessibilidade
3. Adiciona for= nos labels da calculadora
4. Adiciona aria-label em inputs sem label visivel
5. Adiciona preload no Google Fonts
"""
import re
from pathlib import Path

base = Path(r"C:\Users\welbe\OneDrive\Documentos\landingnow")
html_path = base / "index.html"

# Dimensoes finais das imagens (apos resize):
DIMS = {
    "case-afya":       (800, 5207),
    "case-auge":       (800, 6219),
    "case-barbearia":  (800, 1583),
    "case-cafelumiere":(800, 2415),
    "case-dratarma":   (800, 1979),
    "case-emjogo":     (800, 2549),
    "case-kronos":     (800, 3021),
    "case-mra":        (800, 5271),
    "case-sakura":     (800, 2997),
    "case-tafelite":   (800, 2555),
    "case-velar":      (800, 1483),
    "welber":          (600, 600),
}

# Ordem dos cases no HTML (pra saber qual eh "above the fold")
# Primeira eh case-auge (eager), resto eh lazy
CASES_EAGER = {"case-auge"}  # apenas a primeira do carrossel carrega eager

html = html_path.read_text(encoding="utf-8")
changes = []

# ============================================================
# 1) SUBSTITUIR <img> DOS CASES
# ============================================================
def replace_case_img(match):
    full_tag = match.group(0)
    filename = match.group(1)  # ex: "case-auge"
    alt = match.group(2)
    
    w, h = DIMS[filename]
    is_eager = filename in CASES_EAGER
    
    loading_attr = '' if is_eager else ' loading="lazy"'
    fetchpriority = ' fetchpriority="high"' if is_eager else ''
    
    new_tag = (
        f'<img src="cases/{filename}.webp" alt="{alt}" '
        f'width="{w}" height="{h}" decoding="async"{loading_attr}{fetchpriority}>'
    )
    changes.append(f"  cases/{filename}: PNG -> WebP, {w}x{h}, {'eager' if is_eager else 'lazy'}")
    return new_tag

html, n1 = re.subn(
    r'<img\s+src="cases/(case-[a-z]+)\.png"\s+alt="([^"]+)">',
    replace_case_img,
    html
)
print(f"Imagens de cases substituidas: {n1}")

# ============================================================
# 2) SUBSTITUIR <img> DO FOUNDER (welber)
# ============================================================
def replace_founder_img(match):
    alt = match.group(1)
    w, h = DIMS["welber"]
    changes.append(f"  welber.jpeg -> welber.webp, {w}x{h}, lazy")
    return (
        f'<img src="welber.webp" alt="{alt}" '
        f'width="{w}" height="{h}" decoding="async" loading="lazy">'
    )

html, n2 = re.subn(
    r'<img\s+src="welber\.jpeg"\s+alt="([^"]+)">',
    replace_founder_img,
    html
)
print(f"Imagem do founder substituida: {n2}")

# ============================================================
# 3) ADICIONAR for= NOS LABELS DA CALCULADORA
# ============================================================
label_replacements = [
    ('<label>Nome do seu negócio</label>',
     '<label for="bizName">Nome do seu negócio</label>'),
    ('<label>Ticket médio (R$)</label>',
     '<label for="ticket">Ticket médio (R$)</label>'),
    ('<label>Meta mensal de faturamento (R$)</label>',
     '<label for="goal">Meta mensal de faturamento (R$)</label>'),
]

for old, new in label_replacements:
    if old in html:
        html = html.replace(old, new, 1)
        changes.append(f"  Label: {new[:60]}...")

# Label "Segmento" eh para um grupo de botoes, nao para um input.
# Tornar acessivel envolvendo em fieldset/legend OU adicionando role/aria.
# Forma mais simples: trocar <label>Segmento</label> por um titulo descritivo + role=group.
# Aqui vou manter o label mas adicionar aria-label nos botoes do nicho.
# Tambem adicionar label para o customNiche oculto.
html = html.replace(
    '<input type="text" id="customNiche" placeholder="Ex: Pet shop, Advocacia, Marketing..."',
    '<input type="text" id="customNiche" aria-label="Especifique outro nicho" placeholder="Ex: Pet shop, Advocacia, Marketing..."',
    1
)
changes.append("  aria-label adicionado em #customNiche")

# Envolver os botoes de nicho em role=group com aria-labelledby
html = html.replace(
    '<label>Segmento</label>\n          <div class="niche-list" id="nicheList">',
    '<label id="nicheLabel">Segmento</label>\n          <div class="niche-list" id="nicheList" role="group" aria-labelledby="nicheLabel">',
    1
)
changes.append("  role=group + aria-labelledby na lista de nichos")

# ============================================================
# 4) ADICIONAR <main> WRAPPER
# ============================================================
# O <main> vai envolver desde <!-- HERO --> ate antes de <!-- FOOTER -->
# Vou marcar o inicio com main e fechar antes do footer

# Adicionar <main> antes do comentario HERO
if '<!-- HERO -->' in html and '<main' not in html:
    html = html.replace(
        '<!-- HERO -->\n<section class="hero">',
        '<main id="main">\n<!-- HERO -->\n<section class="hero">',
        1
    )
    changes.append("  <main> aberto antes do <!-- HERO -->")

# Fechar </main> antes do footer
# Procurar pelo comentario do footer ou <footer
if '<!-- FOOTER -->' in html:
    html = html.replace(
        '<!-- FOOTER -->',
        '</main>\n\n<!-- FOOTER -->',
        1
    )
    changes.append("  </main> fechado antes do <!-- FOOTER -->")
elif '<footer' in html:
    html = re.sub(
        r'(\n\s*)(<footer)',
        r'\n</main>\n\1\2',
        html,
        count=1
    )
    changes.append("  </main> fechado antes do <footer>")

# ============================================================
# 5) ADICIONAR PRELOAD HINT NO GOOGLE FONTS
# ============================================================
# Trocar o link da stylesheet do Google Fonts por um padrao com preload
# Pattern: estamos transformando o <link rel="stylesheet"> em rel="preload" as="style"
# E adicionando um <link rel="stylesheet"> de fallback (com onload trick)

old_fonts = '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">'
new_fonts = '''<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">'''

if old_fonts in html:
    html = html.replace(old_fonts, new_fonts)
    changes.append("  Preload hint adicionado para Google Fonts")

# ============================================================
# SALVAR
# ============================================================
html_path.write_text(html, encoding="utf-8")
print("\n" + "="*60)
print("MUDANCAS APLICADAS:")
print("="*60)
for c in changes:
    print(c)
print(f"\nArquivo salvo: {html_path}")
print(f"Tamanho final: {html_path.stat().st_size / 1024:.1f} KB")
