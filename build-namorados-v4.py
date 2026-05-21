"""
build-namorados-v4.py
Dois ajustes:
1. Conserta o badge Novo do Premium IA (estava perdido visualmente).
   Solucao: borda do card new-plan tambem vira rosa no tema, badge ganha
   glow mais forte e fica integrado.
2. Muda janela do Dia dos Namorados de 25/05-12/06 para 20/05-12/06
   (aproveitar ao maximo a estreia, ja ativando hoje).
"""
from pathlib import Path
from datetime import datetime
import shutil
import re

ROOT = Path(__file__).parent
THEMES = ROOT / 'themes'
NAMORADOS = THEMES / 'namorados'
CALENDAR = THEMES / 'calendar.js'

stamp = datetime.now().strftime('%Y%m%d-%H%M%S')

# ============================================================
# 1. CALENDAR.JS - muda data de inicio dos namorados pra 20/05
# ============================================================
bak = CALENDAR.parent / f'calendar.js.before-v4-{stamp}.bak'
shutil.copy2(CALENDAR, bak)
print(f'Backup: themes/{bak.name}')

cal = CALENDAR.read_text(encoding='utf-8')

# Substitui:
#   start: new Date(year, 4, 25),
# Por:
#   start: new Date(year, 4, 20),
# Mas apenas dentro do bloco "Dia dos Namorados".

pattern = re.compile(
    r"(slug:\s*'namorados',\s*name:\s*'Dia dos Namorados',\s*start:\s*new Date\(year,\s*4,\s*)25(\s*\))"
)
new_cal, count = pattern.subn(r'\g<1>20\g<2>', cal)
if count > 0:
    CALENDAR.write_bytes(new_cal.encode('utf-8'))
    print(f'calendar.js atualizado: Dia dos Namorados agora comeca em 20/05')
else:
    print('AVISO: nao encontrou o padrao no calendar.js, verificar manualmente')

# ============================================================
# 2. THEME.CSS - ajusta border + glow do new-plan card
# ============================================================
theme_path = NAMORADOS / 'theme.css'
bak_theme = NAMORADOS / f'theme.css.before-v4-{stamp}.bak'
shutil.copy2(theme_path, bak_theme)
print(f'Backup: namorados/{bak_theme.name}')

APPEND_FIX = """

/* ============================================================
   v4 FIX - Card Premium IA: borda rosa + badge integrado
   Antes o badge ficava "perdido" porque a borda do card era verde
   e o badge rosa nao conectava visualmente. Agora os dois sao rosa.
   ============================================================ */

/* Borda do card Premium IA vira rosa no tema */
body.theme-namorados .price-card.new-plan {
  border-color: var(--theme-accent) !important;
  box-shadow:
    0 0 30px rgba(255, 77, 122, 0.25),
    0 0 60px rgba(255, 77, 122, 0.12),
    inset 0 0 30px rgba(255, 77, 122, 0.04) !important;
}

body.theme-namorados .price-card.new-plan:hover {
  box-shadow:
    0 0 40px rgba(255, 77, 122, 0.35),
    0 0 80px rgba(255, 77, 122, 0.18),
    inset 0 0 30px rgba(255, 77, 122, 0.06) !important;
  transform: translateY(-3px);
}

/* Badge Novo: fundo escuro + borda rosa intensa + glow forte */
body.theme-namorados .price-card.new-plan .new-badge {
  background: var(--bg) !important;
  border: 1.5px solid var(--theme-accent) !important;
  color: var(--theme-accent) !important;
  box-shadow:
    0 0 16px rgba(255, 77, 122, 0.4),
    0 0 32px rgba(255, 77, 122, 0.2) !important;
  top: -13px !important;
  z-index: 3;
}

/* Cor do "PLANO PREMIUM IA" - eyebrow do card - vira rosa pra harmonizar */
body.theme-namorados .price-card.new-plan .price-card-name {
  color: var(--theme-accent) !important;
}
"""

current = theme_path.read_text(encoding='utf-8')
if 'v4 FIX - Card Premium IA' not in current:
    theme_path.write_bytes((current + APPEND_FIX).encode('utf-8'))
    print(f'theme.css atualizado: +{len(APPEND_FIX)} chars')
else:
    print('theme.css ja contem v4 fix, pulando')

print()
print('v4 aplicada. Tema agora comeca em 20/05 e card Premium IA integrado.')
