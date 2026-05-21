"""
apply-theme-engine.py
Integra o motor de temas sazonais no index.html e atualiza o app.js
com o tema sazonal como add-on opcional nos 4 planos.

Faz backup versionado antes de qualquer modificacao.
"""
from pathlib import Path
import re
import shutil
from datetime import datetime

ROOT = Path(__file__).parent
INDEX = ROOT / 'index.html'
APP = ROOT / 'app.js'
BASE_CSS = ROOT / 'themes' / 'base.css'

stamp = datetime.now().strftime('%Y%m%d-%H%M%S')

# ============================================================
# 1. BACKUPS
# ============================================================
for src in [INDEX, APP]:
    bak = src.parent / f'{src.name}.before-theme-engine-{stamp}.bak'
    shutil.copy2(src, bak)
    print(f'Backup: {bak.name}')

# ============================================================
# 2. ATUALIZA themes/base.css com CSS do seasonal-addon
# ============================================================
ADDON_CSS = """

/* ============================================================
   Seasonal Add-on - bloco de venda do tema sazonal automatico
   ============================================================ */

.seasonal-addon {
  margin-top: 48px;
  padding: 40px 36px;
  background: linear-gradient(135deg, rgba(200, 255, 61, 0.04) 0%, rgba(255, 77, 122, 0.04) 100%);
  border: 1px solid var(--line);
  border-radius: 24px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 32px;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.seasonal-addon::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(200, 255, 61, 0.06) 0%, transparent 60%);
  pointer-events: none;
  filter: blur(40px);
}

.seasonal-addon-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
}

.seasonal-addon-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(200, 255, 61, 0.1);
  border: 1px solid rgba(200, 255, 61, 0.3);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  color: var(--neon);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 18px;
  font-family: 'Inter', sans-serif;
}

.seasonal-addon h3 {
  font-family: 'Inter', sans-serif;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 14px;
}

.seasonal-addon h3 em {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-weight: 400;
  color: var(--neon);
}

.seasonal-addon p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink-soft);
  margin-bottom: 18px;
  text-align: justify;
}

.seasonal-addon-occasions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.seasonal-addon-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 100px;
  color: var(--ink-soft);
}

.seasonal-addon-action {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
  text-align: right;
}

.seasonal-addon-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.seasonal-addon-price strong {
  font-family: 'Inter', sans-serif;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--ink);
}

.seasonal-addon-price small {
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
}

.seasonal-addon-cta {
  background: var(--whatsapp);
  color: var(--bg);
  padding: 14px 24px;
  border-radius: 100px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 20px rgba(37, 211, 102, 0.25);
  white-space: nowrap;
}

.seasonal-addon-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(37, 211, 102, 0.45);
}

.seasonal-addon-cta svg {
  width: 16px;
  height: 16px;
  fill: var(--bg);
}

@media (max-width: 768px) {
  .seasonal-addon {
    grid-template-columns: 1fr;
    padding: 28px 22px;
    gap: 24px;
    margin-top: 32px;
  }
  .seasonal-addon-action {
    align-items: stretch;
    text-align: center;
  }
  .seasonal-addon-price {
    align-items: center;
  }
  .seasonal-addon-cta {
    justify-content: center;
    width: 100%;
  }
  .seasonal-addon h3 {
    text-align: center;
  }
  .seasonal-addon p {
    text-align: justify;
  }
}
"""

base_current = BASE_CSS.read_text(encoding='utf-8')
if 'Seasonal Add-on' not in base_current:
    BASE_CSS.write_bytes((base_current + ADDON_CSS).encode('utf-8'))
    print(f'Atualizado: themes/base.css (+{len(ADDON_CSS)} chars)')
else:
    print('themes/base.css ja contem Seasonal Add-on, pulando.')

# ============================================================
# 3. MODIFICA index.html
# ============================================================

html = INDEX.read_text(encoding='utf-8')

# 3a. Adiciona link do base.css e scripts do motor antes do </head>
THEME_HEAD_TAGS = """<!-- ============================================================ -->
<!-- LANDINGNOW - MOTOR DE TEMAS SAZONAIS                          -->
<!-- ============================================================ -->
<link rel="stylesheet" href="/themes/base.css">
<script defer src="/themes/calendar.js"></script>
<script defer src="/themes/engine.js"></script>
"""

if 'MOTOR DE TEMAS SAZONAIS' not in html:
    html = html.replace('</head>', THEME_HEAD_TAGS + '</head>')
    print('Inserido: tags do motor de temas no <head>')
else:
    print('index.html ja contem o motor de temas no head, pulando.')

# 3b. Adiciona a section do seasonal-addon dentro da pricing-section,
#     logo apos os <p> finais de observacoes e ANTES do </div></section>
SEASONAL_SECTION = """
    <div class="seasonal-addon">
      <div class="seasonal-addon-content">
        <div class="seasonal-addon-tag">
          <span>&#10024;</span> Add-on opcional
        </div>
        <h3>Sua landing muda de cara <em>em cada data comemorativa.</em></h3>
        <p>Sua pagina se transforma sozinha na virada do dia e volta ao normal quando a data termina. Sem mexer no codigo, sem te chamar pra ajustar nada. Programado e automatico.</p>
        <div class="seasonal-addon-occasions">
          <span class="seasonal-addon-chip">Ano Novo</span>
          <span class="seasonal-addon-chip">Carnaval</span>
          <span class="seasonal-addon-chip">Pascoa</span>
          <span class="seasonal-addon-chip">Dia das Maes</span>
          <span class="seasonal-addon-chip">Namorados</span>
          <span class="seasonal-addon-chip">Festa Junina</span>
          <span class="seasonal-addon-chip">Dia dos Pais</span>
          <span class="seasonal-addon-chip">Independencia</span>
          <span class="seasonal-addon-chip">Dia das Criancas</span>
          <span class="seasonal-addon-chip">Halloween</span>
          <span class="seasonal-addon-chip">Black Friday</span>
          <span class="seasonal-addon-chip">Natal</span>
        </div>
      </div>
      <div class="seasonal-addon-action">
        <div class="seasonal-addon-price">
          <strong>R$ 347</strong>
          <small>adicional unico, vale pra qualquer plano</small>
        </div>
        <a href="https://wa.me/5561985970300?text=Ol%C3%A1!%20Quero%20o%20tema%20sazonal%20autom%C3%A1tico%20de%20R%24%20347" class="seasonal-addon-cta">
          <svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
          Adicionar ao meu plano
        </a>
      </div>
    </div>
  </div>
</section>

<!-- PLAN DETAILS MODAL -->"""

if 'seasonal-addon' not in html:
    # Encontra o final da pricing-section: </section> seguido de <!-- PLAN DETAILS MODAL -->
    marker = '  </div>\n</section>\n\n<!-- PLAN DETAILS MODAL -->'
    if marker in html:
        html = html.replace(marker, SEASONAL_SECTION)
        print('Inserido: seasonal-addon dentro da pricing-section')
    else:
        # Fallback se o whitespace estiver diferente
        marker_alt = '<!-- PLAN DETAILS MODAL -->'
        if marker_alt in html:
            # Insere logo antes do comentario
            replacement = SEASONAL_SECTION.strip() + '\n\n'
            html = html.replace(marker_alt, replacement + marker_alt, 1)
            print('Inserido: seasonal-addon antes do PLAN DETAILS MODAL (fallback)')
        else:
            print('AVISO: nao encontrou ponto de insercao para seasonal-addon')
else:
    print('index.html ja contem seasonal-addon, pulando.')

INDEX.write_bytes(html.encode('utf-8'))
print(f'index.html atualizado ({len(html)} chars)')

# ============================================================
# 4. MODIFICA app.js - adiciona tema sazonal nos excluded de cada plano
# ============================================================
js = APP.read_text(encoding='utf-8')

ADDON_LINE = "        'Tema sazonal automatico (+ R$ 347, unico)'"

# Em cada bloco excluded: [...], adiciona a linha do tema antes do fechamento ]
# Estrategia: para cada um dos 4 planos, encontra o array excluded e adiciona
# a linha como ultimo item

# Padrao: identifica blocos "excluded: [\n...lista...\n      ]" e injeta
# Vamos usar regex pra capturar cada bloco excluded e adicionar a linha

if 'Tema sazonal automatico' not in js:
    # Funcao de substituicao por callback
    def add_addon_to_excluded(match):
        content = match.group(1)
        # Garantir que termine com virgula antes de adicionar nova linha
        content_stripped = content.rstrip()
        if content_stripped.endswith(','):
            new = content_stripped + '\n' + ADDON_LINE + '\n      '
        else:
            new = content_stripped + ',\n' + ADDON_LINE + '\n      '
        return 'excluded: [\n' + new + ']'

    pattern = re.compile(r'excluded:\s*\[\n(.*?)\n\s*\]', re.DOTALL)
    new_js, count = pattern.subn(add_addon_to_excluded, js)
    print(f'app.js: {count} blocos excluded atualizados')
    APP.write_bytes(new_js.encode('utf-8'))
else:
    print('app.js ja contem Tema sazonal automatico, pulando.')

print()
print('Integracao completa. Validar carregando o site localmente.')
