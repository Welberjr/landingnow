"""
build-namorados-v3.py
Reforça o tema Dia dos Namorados na seção pricing com:
- Tag temática substituindo o eyebrow
- Coraçãozinho ao lado de cada price-card-title
- Card Pro (featured) com glow rosa neon forte
- Coração neon gigante decorativo
- Trust signal no rodapé da pricing
"""
from pathlib import Path
from datetime import datetime
import shutil

ROOT = Path(__file__).parent
THEMES = ROOT / 'themes'
NAMORADOS = THEMES / 'namorados'

stamp = datetime.now().strftime('%Y%m%d-%H%M%S')

for f in ['theme.css', 'decorations.js']:
    src = NAMORADOS / f
    if src.exists():
        bak = NAMORADOS / f'{f}.before-v3-{stamp}.bak'
        shutil.copy2(src, bak)
        print(f'Backup: namorados/{bak.name}')

# ============================================================
# Apêndice ao theme.css - novos elementos da seção pricing
# ============================================================
APPEND_CSS = """

/* ============================================================
   v3 - REFORCO NA SECAO PRICING
   ============================================================ */

/* Esconde o eyebrow original e injeta tag tematica no lugar */
body.theme-namorados .pricing-section .section-label {
  display: none !important;
}

.theme-namorados-pricing-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  background: rgba(255, 77, 122, 0.08);
  border: 1.5px solid var(--theme-accent);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  color: var(--theme-accent);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  box-shadow: 0 0 24px rgba(255, 77, 122, 0.25), inset 0 0 12px rgba(255, 77, 122, 0.05);
  margin-top: 20px;
  font-family: 'Inter', sans-serif;
}

.theme-namorados-pricing-tag svg {
  width: 14px;
  height: 14px;
  fill: var(--theme-accent);
  filter: drop-shadow(0 0 6px var(--theme-glow));
}

/* Posicionamento da pricing section pra acomodar o coracao gigante */
body.theme-namorados .pricing-section {
  position: relative;
  overflow: hidden;
}

/* Coracao neon gigante decorativo - canto superior direito */
.theme-namorados-giant-heart {
  position: absolute;
  top: 40px;
  right: -60px;
  width: 420px;
  height: 420px;
  pointer-events: none;
  z-index: 1;
  opacity: 0.55;
  animation: ln-giant-pulse 4s ease-in-out infinite;
}

.theme-namorados-giant-heart svg {
  width: 100%;
  height: 100%;
}

@keyframes ln-giant-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.03); }
}

@media (max-width: 980px) {
  .theme-namorados-giant-heart {
    width: 280px;
    height: 280px;
    top: 20px;
    right: -80px;
    opacity: 0.35;
  }
}

@media (max-width: 768px) {
  .theme-namorados-giant-heart {
    display: none;
  }
}

/* Coracaozinho ao lado de cada price-card-title */
body.theme-namorados .price-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

body.theme-namorados .price-card-title::after {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4D7A'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>");
  background-size: contain;
  background-repeat: no-repeat;
  flex-shrink: 0;
  filter: drop-shadow(0 0 6px var(--theme-glow));
  animation: ln-heart-pulse 2s ease-in-out infinite;
}

/* Card Pro (featured) com glow rosa neon FORTE */
body.theme-namorados .price-card.featured {
  border: 1.5px solid var(--theme-accent) !important;
  box-shadow:
    0 0 0 1.5px var(--theme-accent),
    0 0 40px rgba(255, 77, 122, 0.45),
    0 0 80px rgba(255, 77, 122, 0.22),
    inset 0 0 40px rgba(255, 77, 122, 0.04) !important;
  position: relative;
  z-index: 2;
}

body.theme-namorados .price-card.featured:hover {
  box-shadow:
    0 0 0 1.5px var(--theme-accent),
    0 0 60px rgba(255, 77, 122, 0.6),
    0 0 100px rgba(255, 77, 122, 0.3),
    inset 0 0 50px rgba(255, 77, 122, 0.06) !important;
  transform: translateY(-3px);
}

/* Badge "MAIS ESCOLHIDO" do Pro em rosa */
body.theme-namorados .price-card.featured .featured-badge {
  background: var(--theme-accent) !important;
  color: var(--bg) !important;
  box-shadow: 0 0 24px var(--theme-glow), 0 0 40px rgba(255, 77, 122, 0.3) !important;
  font-weight: 700;
  letter-spacing: 0.1em;
}

/* Badge "NOVO" do Premium IA em rosa outline */
body.theme-namorados .price-card.new-plan .new-badge {
  background: rgba(255, 77, 122, 0.08) !important;
  border: 1.5px solid var(--theme-accent) !important;
  color: var(--theme-accent) !important;
  box-shadow: 0 0 16px rgba(255, 77, 122, 0.2) !important;
}

/* Trust signal no rodape da pricing */
.theme-namorados-pricing-trust {
  margin-top: 56px;
  padding: 18px 36px;
  background: rgba(255, 77, 122, 0.04);
  border: 1px solid var(--theme-border);
  border-radius: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  text-align: center;
  font-size: 14px;
  color: var(--ink-soft);
  flex-wrap: wrap;
  font-weight: 500;
  box-shadow: 0 0 24px rgba(255, 77, 122, 0.12);
}

.theme-namorados-pricing-trust strong {
  color: var(--theme-accent);
  font-weight: 700;
}

.theme-namorados-pricing-trust .pricing-trust-heart {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.theme-namorados-pricing-trust .pricing-trust-heart svg {
  width: 100%;
  height: 100%;
  fill: var(--theme-accent);
  filter: drop-shadow(0 0 6px var(--theme-glow));
}

.theme-namorados-pricing-trust .pricing-trust-divider {
  width: 1px;
  height: 22px;
  background: var(--theme-border);
}

@media (max-width: 768px) {
  .theme-namorados-pricing-trust {
    padding: 16px 22px;
    gap: 14px;
    font-size: 12px;
    border-radius: 24px;
  }
  .theme-namorados-pricing-trust .pricing-trust-divider {
    display: none;
  }
  .theme-namorados-pricing-trust .pricing-trust-heart {
    width: 16px;
    height: 16px;
  }
}
"""

theme_path = NAMORADOS / 'theme.css'
current = theme_path.read_text(encoding='utf-8')
if 'v3 - REFORCO NA SECAO PRICING' not in current:
    theme_path.write_bytes((current + APPEND_CSS).encode('utf-8'))
    print(f'Atualizado: namorados/theme.css (+{len(APPEND_CSS)} chars)')
else:
    print('namorados/theme.css ja contem v3, pulando')

# ============================================================
# Apêndice ao decorations.js - injeta elementos na pricing section
# ============================================================
APPEND_JS_BLOCK = """
  // -----------------------------------------------------------
  // v3 - Reforco na secao pricing
  // -----------------------------------------------------------
  const pricingHeader = document.querySelector('.pricing-section .section-header');
  if (pricingHeader && !pricingHeader.querySelector('.theme-namorados-pricing-tag')) {
    const tag = document.createElement('div');
    tag.className = 'theme-namorados-pricing-tag';
    tag.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> Edicao Especial Dia dos Namorados';
    pricingHeader.appendChild(tag);
  }

  // Coracao neon gigante decorativo no canto superior direito da pricing
  const pricingSec = document.querySelector('.pricing-section');
  if (pricingSec && !pricingSec.querySelector('.theme-namorados-giant-heart')) {
    const giant = document.createElement('div');
    giant.className = 'theme-namorados-giant-heart';
    giant.setAttribute('aria-hidden', 'true');
    giant.innerHTML = [
      '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">',
      '<defs>',
      '<filter id="ln-heart-glow" x="-50%" y="-50%" width="200%" height="200%">',
      '<feGaussianBlur stdDeviation="4" result="blur"/>',
      '<feMerge>',
      '<feMergeNode in="blur"/>',
      '<feMergeNode in="blur"/>',
      '<feMergeNode in="SourceGraphic"/>',
      '</feMerge>',
      '</filter>',
      '</defs>',
      '<path d="M 200 340 C 110 270, 60 215, 60 155 C 60 105, 105 80, 135 80 C 165 80, 190 100, 200 130 C 210 100, 235 80, 265 80 C 295 80, 340 105, 340 155 C 340 215, 290 270, 200 340 Z" fill="none" stroke="#FF4D7A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#ln-heart-glow)"/>',
      '<path d="M 230 350 C 320 290, 380 230, 385 145 C 385 110, 360 85, 335 80" fill="none" stroke="#FF4D7A" stroke-width="2" stroke-linecap="round" opacity="0.5" filter="url(#ln-heart-glow)"/>',
      '<circle cx="80" cy="120" r="2.5" fill="#FF4D7A" opacity="0.7"/>',
      '<circle cx="350" cy="240" r="2" fill="#FF4D7A" opacity="0.6"/>',
      '<circle cx="320" cy="320" r="2.5" fill="#FF4D7A" opacity="0.5"/>',
      '<circle cx="100" cy="280" r="1.5" fill="#FF4D7A" opacity="0.6"/>',
      '</svg>'
    ].join('');
    pricingSec.appendChild(giant);
  }

  // Trust signal no rodape da pricing
  const pricingContainer = document.querySelector('.pricing-section .container');
  if (pricingContainer && !document.querySelector('.theme-namorados-pricing-trust')) {
    const trust = document.createElement('div');
    trust.className = 'theme-namorados-pricing-trust';
    trust.innerHTML =
      '<span class="pricing-trust-heart">' + HEART_FILL + '</span>' +
      '<span>Mais do que paginas, criamos experiencias que <strong>conquistam.</strong></span>' +
      '<span class="pricing-trust-divider"></span>' +
      '<span>Feito com foco em <strong>conversao.</strong></span>' +
      '<span class="pricing-trust-heart">' + HEART_FILL + '</span>';
    pricingContainer.appendChild(trust);
  }
"""

deco_path = NAMORADOS / 'decorations.js'
deco = deco_path.read_text(encoding='utf-8')

if 'v3 - Reforco na secao pricing' not in deco:
    # Injetar o bloco v3 antes do bloco de Cleanup (item 20)
    marker = '  // -----------------------------------------------------------\n  // 20. Cleanup'
    if marker in deco:
        deco = deco.replace(marker, APPEND_JS_BLOCK + '\n' + marker)
        print('v3 inserido antes do cleanup')
    else:
        # Fallback: inserir antes do fechamento da IIFE
        deco = deco.replace('})();', APPEND_JS_BLOCK + '\n})();')
        print('v3 inserido no final (fallback)')
    deco_path.write_bytes(deco.encode('utf-8'))
    print(f'Atualizado: namorados/decorations.js ({len(deco)} chars)')
else:
    print('namorados/decorations.js ja contem v3, pulando')

print()
print('v3 aplicada. Validar localmente.')
