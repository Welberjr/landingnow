"""
build-namorados-v2.py
Reconstroi o tema Dia dos Namorados com tratamento full: hero refeito,
copy temático em todas as seções, cards refeitos, trust signal, corações
outlined com glow neon, glow rosa lateral forte.
Mantém a cor verde da marca intocada em CTAs principais e logo.
"""
from pathlib import Path
from datetime import datetime
import shutil

ROOT = Path(__file__).parent
THEMES = ROOT / 'themes'
NAMORADOS = THEMES / 'namorados'

stamp = datetime.now().strftime('%Y%m%d-%H%M%S')

# Backups dos arquivos atuais antes de sobrescrever
for f in ['theme.css', 'decorations.js']:
    src = NAMORADOS / f
    if src.exists():
        bak = NAMORADOS / f'{f}.before-v2-{stamp}.bak'
        shutil.copy2(src, bak)
        print(f'Backup: namorados/{bak.name}')

# ============================================================
# theme.css - reforco visual completo do tema
# ============================================================
THEME_CSS = """/* ============================================================
   LandingNow - Tema Dia dos Namorados (25/05 a 12/06) - v2 FULL
   Tratamento agressivo: hero refeito, glow rosa intenso lateral,
   cards com bordas glow, coracoes outlined neon, trust signal,
   copy tematico em todas as secoes.
   Cor da marca (verde neon) preservada em CTAs e logo.
   ============================================================ */

body.theme-namorados {
  --theme-accent: #FF4D7A;
  --theme-accent-strong: #FF3366;
  --theme-accent-soft: rgba(255, 77, 122, 0.12);
  --theme-bg-tint: rgba(255, 77, 122, 0.03);
  --theme-glow: rgba(255, 77, 122, 0.4);
  --theme-shadow: 0 12px 40px rgba(255, 77, 122, 0.25);
  --theme-shadow-strong: 0 20px 60px rgba(255, 77, 122, 0.45);
  --theme-border: rgba(255, 77, 122, 0.35);
  --theme-border-strong: rgba(255, 77, 122, 0.6);
  --theme-deco-display: block;
  --theme-deco-opacity: 1;
}

/* ============================================================
   GLOW LATERAL FORTE - substitui o glow verde original do hero
   ============================================================ */
body.theme-namorados::after {
  background: radial-gradient(circle, rgba(255, 77, 122, 0.18) 0%, transparent 60%) !important;
  width: 900px !important;
  height: 900px !important;
  filter: blur(60px) !important;
}

body.theme-namorados::before {
  content: '';
  position: fixed;
  bottom: -10%;
  right: -10%;
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, rgba(255, 77, 122, 0.12) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
  filter: blur(80px);
}

/* ============================================================
   LOGO - pequeno coracao ao lado do nome
   ============================================================ */
body.theme-namorados .logo-wordmark::after {
  content: '';
  display: inline-block;
  width: 18px;
  height: 18px;
  margin-left: 6px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4D7A'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>");
  background-size: contain;
  background-repeat: no-repeat;
  animation: ln-heart-pulse 2s ease-in-out infinite;
  vertical-align: middle;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px var(--theme-glow));
}

@keyframes ln-heart-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.18); opacity: 0.85; }
}

/* ============================================================
   HERO TAG - substitui pulse verde por badge tematico rosa
   ============================================================ */
body.theme-namorados .hero-tag {
  border-color: var(--theme-accent) !important;
  color: var(--theme-accent) !important;
  background: rgba(255, 77, 122, 0.05);
  box-shadow: 0 0 24px rgba(255, 77, 122, 0.25), inset 0 0 12px rgba(255, 77, 122, 0.08);
}

body.theme-namorados .hero-tag .pulse {
  display: none !important;
}

body.theme-namorados .hero-tag::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 4px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4D7A'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>");
  background-size: contain;
  background-repeat: no-repeat;
  filter: drop-shadow(0 0 6px var(--theme-glow));
}

/* ============================================================
   HERO H1 - palavra acento e strikethrough em rosa
   ============================================================ */
body.theme-namorados .hero h1 .accent-word {
  background: linear-gradient(90deg, var(--neon) 0%, var(--theme-accent) 100%) !important;
  color: var(--bg) !important;
  box-shadow: 0 0 40px rgba(255, 77, 122, 0.35), 0 0 20px rgba(200, 255, 61, 0.25) !important;
}

body.theme-namorados .hero h1 .strikethrough::after {
  background: var(--theme-accent) !important;
}

/* ============================================================
   HERO CARDS - tratamento glow rosa nos 4 + 1 destaque verde
   ============================================================ */
body.theme-namorados .hero-cards {
  gap: 14px;
}

body.theme-namorados .float-card {
  border: 1.5px solid var(--theme-border) !important;
  box-shadow: 0 0 24px rgba(255, 77, 122, 0.15), inset 0 0 16px rgba(255, 77, 122, 0.03) !important;
  transition: box-shadow 0.35s ease, transform 0.25s ease, border-color 0.35s ease !important;
  background: rgba(20, 12, 16, 0.5) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

body.theme-namorados .float-card:hover {
  border-color: var(--theme-border-strong) !important;
  box-shadow: 0 0 36px rgba(255, 77, 122, 0.3), inset 0 0 20px rgba(255, 77, 122, 0.06) !important;
  transform: translateY(-2px);
}

body.theme-namorados .float-card-icon {
  background: rgba(255, 77, 122, 0.1) !important;
  border: 1.5px solid var(--theme-border) !important;
  color: var(--theme-accent) !important;
  font-size: 18px;
  filter: drop-shadow(0 0 8px var(--theme-glow));
}

body.theme-namorados .float-card.featured {
  border-color: var(--neon) !important;
  background: rgba(200, 255, 61, 0.1) !important;
  box-shadow: 0 0 28px rgba(200, 255, 61, 0.35), inset 0 0 16px rgba(200, 255, 61, 0.08) !important;
}

body.theme-namorados .float-card.featured .float-card-icon {
  background: rgba(200, 255, 61, 0.15) !important;
  border-color: var(--neon) !important;
  color: var(--neon) !important;
  filter: drop-shadow(0 0 8px var(--neon-glow));
}

/* Estrutura do card v2: titulo em cima, subdescricao embaixo */
body.theme-namorados .float-card .card-title {
  font-weight: 700;
  font-size: 15px;
  color: var(--ink);
  display: block;
  margin-bottom: 4px;
}

body.theme-namorados .float-card .card-sub {
  font-size: 12px;
  color: var(--ink-soft);
  display: block;
  line-height: 1.4;
}

/* ============================================================
   TRUST SIGNAL - "Mais de 70 marcas..." abaixo do hero
   ============================================================ */
.theme-namorados-trust {
  text-align: center;
  margin: 40px auto 0;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  font-size: 14px;
  color: var(--ink-soft);
  font-weight: 500;
  max-width: 900px;
}

.theme-namorados-trust strong {
  color: var(--theme-accent);
  font-weight: 700;
}

.theme-namorados-trust .trust-heart {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.theme-namorados-trust .trust-heart svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: var(--theme-accent);
  stroke-width: 2;
  filter: drop-shadow(0 0 6px var(--theme-glow));
}

@media (max-width: 768px) {
  .theme-namorados-trust {
    font-size: 12px;
    margin-top: 28px;
    padding: 12px 16px;
    gap: 10px;
  }
  .theme-namorados-trust .trust-heart {
    width: 14px;
    height: 14px;
  }
}

/* ============================================================
   SECOES SECUNDARIAS - tom rosa em sombras de cards
   ============================================================ */
body.theme-namorados .price-card {
  transition: box-shadow 0.4s ease, transform 0.3s ease, border-color 0.4s ease;
}

body.theme-namorados .price-card:hover {
  box-shadow: var(--theme-shadow);
}

body.theme-namorados .price-card.featured {
  box-shadow: var(--theme-shadow-strong), 0 0 0 1px var(--theme-border-strong);
}

body.theme-namorados .case-card {
  transition: box-shadow 0.4s ease, transform 0.3s ease;
}

body.theme-namorados .case-card:hover {
  box-shadow: var(--theme-shadow);
}

body.theme-namorados .custom-card {
  box-shadow: var(--theme-shadow);
  border-color: var(--theme-border) !important;
}

body.theme-namorados .roi-result {
  box-shadow: var(--theme-shadow);
}

body.theme-namorados .step {
  transition: box-shadow 0.4s ease;
}

body.theme-namorados .step:hover {
  box-shadow: var(--theme-shadow);
}

body.theme-namorados .faq-item {
  transition: box-shadow 0.4s ease, border-color 0.4s ease;
}

body.theme-namorados .faq-item:hover,
body.theme-namorados .faq-item.open {
  box-shadow: var(--theme-shadow);
  border-color: var(--theme-border) !important;
}

/* Final CTA - glow rosa de fundo */
body.theme-namorados .final-cta {
  background-image: radial-gradient(circle at center, var(--theme-accent-soft) 0%, transparent 70%);
}

body.theme-namorados .final-cta h2 em {
  background: linear-gradient(90deg, var(--neon) 0%, var(--theme-accent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* ============================================================
   DECORACOES FLUTUANTES - coracoes outlined com glow neon
   ============================================================ */
.theme-namorados-hearts {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.theme-namorados-hearts .heart {
  position: absolute;
  bottom: -60px;
  opacity: 0;
  animation: ln-heart-float 16s linear infinite;
}

.theme-namorados-hearts .heart svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: var(--theme-accent);
  stroke-width: 1.5;
  filter: drop-shadow(0 0 8px var(--theme-glow)) drop-shadow(0 0 16px rgba(255, 77, 122, 0.25));
}

@keyframes ln-heart-float {
  0% {
    transform: translateY(0) translateX(0) rotate(-8deg) scale(0.9);
    opacity: 0;
  }
  8% { opacity: 0.85; }
  92% { opacity: 0.85; }
  100% {
    transform: translateY(-115vh) translateX(50px) rotate(18deg) scale(1.1);
    opacity: 0;
  }
}

.theme-namorados-hearts .heart:nth-child(1)  { left: 6%;  width: 32px; height: 32px; animation-delay: 0s;    animation-duration: 18s; }
.theme-namorados-hearts .heart:nth-child(2)  { left: 18%; width: 22px; height: 22px; animation-delay: 2.5s;  animation-duration: 15s; }
.theme-namorados-hearts .heart:nth-child(3)  { left: 30%; width: 38px; height: 38px; animation-delay: 5s;    animation-duration: 21s; }
.theme-namorados-hearts .heart:nth-child(4)  { left: 42%; width: 18px; height: 18px; animation-delay: 1s;    animation-duration: 14s; }
.theme-namorados-hearts .heart:nth-child(5)  { left: 56%; width: 28px; height: 28px; animation-delay: 3.5s;  animation-duration: 17s; }
.theme-namorados-hearts .heart:nth-child(6)  { left: 68%; width: 24px; height: 24px; animation-delay: 7s;    animation-duration: 19s; }
.theme-namorados-hearts .heart:nth-child(7)  { left: 80%; width: 34px; height: 34px; animation-delay: 9.5s;  animation-duration: 20s; }
.theme-namorados-hearts .heart:nth-child(8)  { left: 92%; width: 20px; height: 20px; animation-delay: 4s;    animation-duration: 16s; }
.theme-namorados-hearts .heart:nth-child(9)  { left: 12%; width: 26px; height: 26px; animation-delay: 11s;   animation-duration: 18s; }
.theme-namorados-hearts .heart:nth-child(10) { left: 74%; width: 30px; height: 30px; animation-delay: 13s;   animation-duration: 22s; }

/* ============================================================
   SELO DE TEMA - canto inferior direito
   ============================================================ */
.theme-namorados-badge {
  position: fixed;
  bottom: 16px;
  right: 16px;
  background: rgba(10, 10, 10, 0.85);
  border: 1px solid var(--theme-border);
  padding: 8px 14px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.02em;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  opacity: 0;
  animation: ln-badge-in 0.6s ease 1.2s forwards;
  box-shadow: 0 0 16px rgba(255, 77, 122, 0.2);
}

.theme-namorados-badge svg {
  width: 12px;
  height: 12px;
  fill: var(--theme-accent);
  filter: drop-shadow(0 0 4px var(--theme-glow));
}

@keyframes ln-badge-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .theme-namorados-badge {
    display: none;
  }
  .theme-namorados-hearts .heart:nth-child(n+7) {
    display: none;
  }
  body.theme-namorados .hero-cards {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }
}

/* Respeita preferencia de movimento reduzido */
@media (prefers-reduced-motion: reduce) {
  .theme-namorados-hearts { display: none !important; }
  body.theme-namorados .logo-wordmark::after { animation: none !important; }
  .theme-namorados-badge { animation: none !important; opacity: 1; }
}
"""

(NAMORADOS / 'theme.css').write_bytes(THEME_CSS.encode('utf-8'))
print(f'Atualizado: namorados/theme.css ({len(THEME_CSS)} chars)')

# ============================================================
# decorations.js - injecao de copy tematico + decoracoes
# ============================================================
DECORATIONS_JS = """/* ============================================================
   LandingNow - Tema Dia dos Namorados v2 FULL
   decorations.js: substitui copy do hero e secoes, injeta cards
   estilizados, coracoes flutuantes outlined, trust signal e selo.
   ============================================================ */

(function () {
  'use strict';

  if (document.querySelector('.theme-namorados-hearts')) return;

  // SVG do coracao usado em logo, marquee e cards
  const HEART_FILL = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  const HEART_OUTLINE = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

  // -----------------------------------------------------------
  // 1. Helper de substituicao segura
  // -----------------------------------------------------------
  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }
  function setHTML(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  // -----------------------------------------------------------
  // 2. HERO - tag superior
  // -----------------------------------------------------------
  const heroTag = document.querySelector('.hero-tag');
  if (heroTag) {
    heroTag.innerHTML = '<span>Edicao especial Dia dos Namorados</span>';
  }

  // -----------------------------------------------------------
  // 3. HERO - H1 com palavra "clientes" em destaque e "apaixonarem" riscado
  // -----------------------------------------------------------
  setHTML('.hero h1',
    'Sua pagina faz seus <span class="accent-word">clientes</span><br>' +
    'se <span class="strikethrough">apaixonarem.</span>'
  );

  // -----------------------------------------------------------
  // 4. HERO - lead text (sem travessao)
  // -----------------------------------------------------------
  setHTML('.hero p.lead',
    'Landing pages profissionais com foco total em conversao direta no <strong style="color:var(--ink)">WhatsApp</strong>. Estrategia, design e dominio proprio configurado, tudo pronto pra voce vender mais todos os dias.'
  );

  // -----------------------------------------------------------
  // 5. HERO - CTAs
  // -----------------------------------------------------------
  const primaryCta = document.querySelector('.hero-ctas .btn-primary');
  if (primaryCta) {
    const svg = primaryCta.querySelector('svg');
    primaryCta.innerHTML = '';
    if (svg) primaryCta.appendChild(svg);
    primaryCta.appendChild(document.createTextNode(' Quero conquistar mais clientes'));
  }
  const secondaryCta = document.querySelector('.hero-ctas .btn-secondary');
  if (secondaryCta) {
    secondaryCta.textContent = 'Ver o que ta incluso \u2192';
  }

  // -----------------------------------------------------------
  // 6. HERO - cards do lado direito (4 + 1 destaque verde)
  // -----------------------------------------------------------
  const heroCards = document.querySelector('.hero-cards');
  if (heroCards) {
    heroCards.innerHTML = [
      '<div class="float-card">',
      '  <div class="float-card-icon">\u26A1</div>',
      '  <div>',
      '    <span class="card-title">Entrega a partir de 48h</span>',
      '    <span class="card-sub">Seu projeto no ar rapidinho.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card">',
      '  <div class="float-card-icon">\u2665</div>',
      '  <div>',
      '    <span class="card-title">Design que gera desejo</span>',
      '    <span class="card-sub">Visual irresistivel que conecta.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card">',
      '  <div class="float-card-icon">📱</div>',
      '  <div>',
      '    <span class="card-title">Otimizada pra mobile</span>',
      '    <span class="card-sub">Experiencia perfeita em qualquer tela.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card">',
      '  <div class="float-card-icon">🎯</div>',
      '  <div>',
      '    <span class="card-title">Conversao que conquista</span>',
      '    <span class="card-sub">Estrategia focada no que importa: resultados.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card featured">',
      '  <div class="float-card-icon">💬</div>',
      '  <div>',
      '    <span class="card-title">Botao WhatsApp direto</span>',
      '    <span class="card-sub">Fale com voce em 1 clique.</span>',
      '  </div>',
      '</div>'
    ].join('\\n');
  }

  // -----------------------------------------------------------
  // 7. TRUST SIGNAL abaixo do hero
  // -----------------------------------------------------------
  const heroSection = document.querySelector('.hero');
  if (heroSection && !document.querySelector('.theme-namorados-trust')) {
    const container = heroSection.querySelector('.container') || heroSection;
    const trust = document.createElement('div');
    trust.className = 'theme-namorados-trust';
    trust.innerHTML =
      '<span class="trust-heart">' + HEART_OUTLINE + '</span>' +
      '<span>Mais de <strong>70 marcas</strong> ja conquistaram resultados com a gente.</span>' +
      '<span class="trust-heart">' + HEART_OUTLINE + '</span>';
    container.appendChild(trust);
  }

  // -----------------------------------------------------------
  // 8. MARQUEE - mensagens tematicas
  // -----------------------------------------------------------
  const marqueeMessages = [
    'landings que apaixonam clientes',
    'entrega em ate 5 dias',
    'copy que faz vender',
    '100% mobile',
    'design que conquista'
  ];
  const marquee = document.querySelector('.marquee');
  if (marquee) {
    const spans = marquee.querySelectorAll('span');
    spans.forEach(function (s, i) {
      s.textContent = marqueeMessages[i % marqueeMessages.length];
    });
  }

  // -----------------------------------------------------------
  // 9. CASES - titulo, descricao, CTA
  // -----------------------------------------------------------
  setHTML('.cases-section h2', 'Trabalhos que <em class="italic">conquistaram clientes.</em>');
  setHTML('.cases-section .cases-cta h3', 'Quer ver seu negocio na <em>proxima conquista?</em>');
  const casesCtaLink = document.querySelector('.cases-section .cases-cta .btn-neon');
  if (casesCtaLink) casesCtaLink.textContent = 'Quero conquistar a minha \u2192';

  // -----------------------------------------------------------
  // 10. ROI CALCULATOR - titulo e descricao
  // -----------------------------------------------------------
  setHTML('.roi-section h2', 'Quantos clientes voce precisa <em class="italic">pra conquistar sua meta?</em>');

  // -----------------------------------------------------------
  // 11. PRICING - titulo tematico
  // -----------------------------------------------------------
  setHTML('.pricing-section h2', 'Quatro caminhos pra <em class="italic">apaixonar seu cliente.</em>');

  // -----------------------------------------------------------
  // 12. CUSTOM PROJECTS - inalterado (mantem texto neutro)
  // -----------------------------------------------------------

  // -----------------------------------------------------------
  // 13. FOUNDER - titulo com tempero romantico
  // -----------------------------------------------------------
  setHTML('.founder-section h2',
    'Voce nao ta contratando uma agencia. Ta contratando <em>uma pessoa apaixonada pelo que faz.</em>'
  );

  // -----------------------------------------------------------
  // 14. HOW - titulo inalterado (ja eh forte)
  // -----------------------------------------------------------

  // -----------------------------------------------------------
  // 15. FAQ - titulo inalterado
  // -----------------------------------------------------------

  // -----------------------------------------------------------
  // 16. FINAL CTA - titulo com gradient automatico via CSS
  // -----------------------------------------------------------
  setHTML('.final-cta h2', 'Bora <em>conquistar</em><br>mais clientes?');
  setText('.final-cta p', 'Sua proxima pagina, no ar a partir de 48h. A partir de R$ 99,90.');

  // -----------------------------------------------------------
  // 17. SEASONAL ADDON - copy tematico
  // -----------------------------------------------------------
  setHTML('.seasonal-addon h3',
    'Sua landing muda de cara <em>em cada data comemorativa.</em>'
  );

  // -----------------------------------------------------------
  // 18. CORACOES FLUTUANTES - 10 coracoes outlined com glow
  // -----------------------------------------------------------
  const hearts = document.createElement('div');
  hearts.className = 'theme-namorados-hearts';
  hearts.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 10; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.innerHTML = HEART_OUTLINE;
    hearts.appendChild(h);
  }
  document.body.appendChild(hearts);

  // -----------------------------------------------------------
  // 19. SELO DE TEMA - canto inferior direito
  // -----------------------------------------------------------
  if (!document.querySelector('.theme-namorados-badge')) {
    const badge = document.createElement('div');
    badge.className = 'theme-namorados-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = HEART_FILL + ' Tema Namorados';
    document.body.appendChild(badge);
  }

  // -----------------------------------------------------------
  // 20. Cleanup ao trocar de tema
  // -----------------------------------------------------------
  window.addEventListener('landingnow:theme-applied', function (e) {
    if (e.detail.slug !== 'namorados') {
      const toRemove = document.querySelectorAll(
        '.theme-namorados-hearts, .theme-namorados-badge, .theme-namorados-trust'
      );
      toRemove.forEach(function (el) { el.remove(); });
    }
  });
})();
"""

(NAMORADOS / 'decorations.js').write_bytes(DECORATIONS_JS.encode('utf-8'))
print(f'Atualizado: namorados/decorations.js ({len(DECORATIONS_JS)} chars)')

print()
print('Tema Namorados v2 reconstruido. Validar localmente.')
