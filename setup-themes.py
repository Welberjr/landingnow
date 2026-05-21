"""
setup-themes.py
Cria toda a infraestrutura do motor de temas sazonais da LandingNow.
Gera: base.css, calendar.js, engine.js, e tema completo de Dia dos Namorados.
"""
from pathlib import Path

ROOT = Path(__file__).parent
THEMES = ROOT / 'themes'

# ============================================================
# base.css - variaveis CSS neutras (default, sem tema ativo)
# ============================================================
BASE_CSS = """/* ============================================================
   LandingNow - Motor de Temas Sazonais
   base.css: variaveis CSS neutras quando nenhum tema esta ativo.
   Cada tema sobrescreve essas variaveis em sua propria classe.
   IMPORTANTE: as variaveis da marca (--neon, --bg, --ink, --hot)
   permanecem intactas. Os temas atuam apenas em camadas secundarias.
   ============================================================ */

:root {
  /* Cor de apoio do tema (transparente no default) */
  --theme-accent: transparent;
  --theme-accent-soft: transparent;

  /* Tom de fundo do tema (aplicado em seções alternadas) */
  --theme-bg-tint: transparent;

  /* Sombra colorida do tema (aplicada em cards) */
  --theme-shadow: 0 0 0 transparent;

  /* Borda colorida do tema */
  --theme-border: transparent;

  /* Estado de exibicao dos elementos decorativos */
  --theme-deco-display: none;
  --theme-deco-opacity: 0;
}

/* Container global de decoracoes do tema (corações flutuantes, neve, etc.) */
.theme-decorations {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
  display: var(--theme-deco-display);
  opacity: var(--theme-deco-opacity);
  transition: opacity 0.8s ease;
}

/* Marcador do tema ao lado do logotipo */
.theme-logo-mark {
  display: var(--theme-deco-display);
  margin-left: 2px;
  vertical-align: middle;
  width: 18px;
  height: 18px;
}

/* Respeita preferencia de movimento reduzido */
@media (prefers-reduced-motion: reduce) {
  .theme-decorations {
    display: none !important;
  }
}
"""

# ============================================================
# calendar.js - calendario de temas com janelas de datas
# ============================================================
CALENDAR_JS = """/* ============================================================
   LandingNow - Motor de Temas Sazonais
   calendar.js: define o calendario de temas e funcoes auxiliares
   para resolver datas moveis (Carnaval, Pascoa, Maes, Pais, Black Friday).
   ============================================================ */

(function (global) {
  'use strict';

  // -----------------------------------------------------------
  // Funcoes auxiliares de calculo de datas moveis
  // -----------------------------------------------------------

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  // Domingo de Pascoa (algoritmo de Meeus / Jones / Butcher)
  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  // N-esima ocorrencia de um dia da semana em um mes
  // weekday: 0=domingo, 1=segunda, ..., 6=sabado
  function nthWeekdayOfMonth(year, month, weekday, n) {
    const first = new Date(year, month, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (n - 1) * 7);
  }

  // -----------------------------------------------------------
  // Construtor do calendario de temas para um ano especifico
  // -----------------------------------------------------------

  function buildCalendar(year) {
    const themes = [];

    // Pascoa e Carnaval (datas moveis)
    const easter = easterSunday(year);
    const ashWednesday = addDays(easter, -46);

    // Ano Novo (26/12 a 02/01) - cobre virada de ano
    themes.push({
      slug: 'anonovo',
      name: 'Ano Novo',
      start: new Date(year - 1, 11, 26),
      end: new Date(year, 0, 2, 23, 59, 59)
    });
    themes.push({
      slug: 'anonovo',
      name: 'Ano Novo',
      start: new Date(year, 11, 26),
      end: new Date(year + 1, 0, 2, 23, 59, 59)
    });

    // Carnaval (12 dias antes da quarta de cinzas ate a quarta de cinzas)
    themes.push({
      slug: 'carnaval',
      name: 'Carnaval',
      start: addDays(ashWednesday, -12),
      end: new Date(ashWednesday.getFullYear(), ashWednesday.getMonth(), ashWednesday.getDate(), 23, 59, 59)
    });

    // Pascoa (semana anterior ao domingo)
    themes.push({
      slug: 'pascoa',
      name: 'Pascoa',
      start: addDays(easter, -7),
      end: new Date(easter.getFullYear(), easter.getMonth(), easter.getDate(), 23, 59, 59)
    });

    // Dia das Maes (1a semana ate o 2o domingo de maio)
    const diaMaes = nthWeekdayOfMonth(year, 4, 0, 2); // maio = 4 (0-indexed)
    themes.push({
      slug: 'maes',
      name: 'Dia das Maes',
      start: addDays(diaMaes, -7),
      end: new Date(diaMaes.getFullYear(), diaMaes.getMonth(), diaMaes.getDate(), 23, 59, 59)
    });

    // Dia dos Namorados (25/05 a 12/06)
    themes.push({
      slug: 'namorados',
      name: 'Dia dos Namorados',
      start: new Date(year, 4, 25),
      end: new Date(year, 5, 12, 23, 59, 59)
    });

    // Festa Junina (13/06 a 30/06)
    themes.push({
      slug: 'junina',
      name: 'Festa Junina',
      start: new Date(year, 5, 13),
      end: new Date(year, 5, 30, 23, 59, 59)
    });

    // Dia dos Pais (1a semana ate o 2o domingo de agosto)
    const diaPais = nthWeekdayOfMonth(year, 7, 0, 2);
    themes.push({
      slug: 'pais',
      name: 'Dia dos Pais',
      start: addDays(diaPais, -7),
      end: new Date(diaPais.getFullYear(), diaPais.getMonth(), diaPais.getDate(), 23, 59, 59)
    });

    // Independencia (05/09 a 07/09)
    themes.push({
      slug: 'independencia',
      name: 'Independencia do Brasil',
      start: new Date(year, 8, 5),
      end: new Date(year, 8, 7, 23, 59, 59)
    });

    // Dia das Criancas (10/10 a 12/10)
    themes.push({
      slug: 'criancas',
      name: 'Dia das Criancas',
      start: new Date(year, 9, 10),
      end: new Date(year, 9, 12, 23, 59, 59)
    });

    // Halloween (25/10 a 31/10)
    themes.push({
      slug: 'halloween',
      name: 'Halloween',
      start: new Date(year, 9, 25),
      end: new Date(year, 9, 31, 23, 59, 59)
    });

    // Black Friday (mes inteiro de novembro)
    themes.push({
      slug: 'blackfriday',
      name: 'Black Friday',
      start: new Date(year, 10, 1),
      end: new Date(year, 10, 30, 23, 59, 59)
    });

    // Natal (10/12 a 25/12)
    themes.push({
      slug: 'natal',
      name: 'Natal',
      start: new Date(year, 11, 10),
      end: new Date(year, 11, 25, 23, 59, 59)
    });

    return themes;
  }

  // -----------------------------------------------------------
  // Resolve qual tema esta ativo em uma data especifica
  // -----------------------------------------------------------

  function findActiveTheme(date) {
    const year = date.getFullYear();
    // Junta calendario do ano corrente + ano anterior (pra cobrir Ano Novo)
    const candidates = buildCalendar(year).concat(buildCalendar(year - 1));
    for (const t of candidates) {
      if (date >= t.start && date <= t.end) {
        return t;
      }
    }
    return null;
  }

  // -----------------------------------------------------------
  // Exporta no escopo global
  // -----------------------------------------------------------

  global.LandingNowCalendar = {
    buildCalendar: buildCalendar,
    findActiveTheme: findActiveTheme,
    easterSunday: easterSunday,
    nthWeekdayOfMonth: nthWeekdayOfMonth
  };
})(window);
"""

# ============================================================
# engine.js - motor que aplica tema no body
# ============================================================
ENGINE_JS = """/* ============================================================
   LandingNow - Motor de Temas Sazonais
   engine.js: detecta data atual, aplica classe no body,
   carrega CSS do tema sob demanda e injeta decoracoes.
   Re-checa a cada 60s pra trocar de tema na virada do dia
   mesmo se o usuario deixar a aba aberta.
   ============================================================ */

(function () {
  'use strict';

  let currentSlug = null;

  function loadCSS(href) {
    if (document.querySelector('link[data-theme-css="' + href + '"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-theme-css', href);
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[data-theme-js="' + src + '"]')) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.setAttribute('data-theme-js', src);
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function applyTheme(theme) {
    if (!theme) {
      // Sem tema ativo: remove todas as classes theme-*
      document.body.className = document.body.className
        .split(' ')
        .filter(function (c) { return !c.startsWith('theme-'); })
        .join(' ');
      currentSlug = null;
      return;
    }

    if (currentSlug === theme.slug) return; // ja esta aplicado

    // Limpa classes antigas
    document.body.className = document.body.className
      .split(' ')
      .filter(function (c) { return !c.startsWith('theme-'); })
      .join(' ');

    // Aplica nova classe
    document.body.classList.add('theme-' + theme.slug);

    // Carrega CSS do tema sob demanda
    loadCSS('/themes/' + theme.slug + '/theme.css');

    // Carrega JS de decoracoes do tema (opcional, pode nao existir)
    loadScript('/themes/' + theme.slug + '/decorations.js').catch(function () {
      // Tema sem decoracoes JS, sem problema
    });

    currentSlug = theme.slug;

    // Dispatch event customizado pra outros scripts saberem
    window.dispatchEvent(new CustomEvent('landingnow:theme-applied', {
      detail: { slug: theme.slug, name: theme.name }
    }));
  }

  function checkAndApply() {
    if (!window.LandingNowCalendar) return;
    const now = new Date();
    const theme = window.LandingNowCalendar.findActiveTheme(now);
    applyTheme(theme);
  }

  // Roda imediatamente no carregamento
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndApply);
  } else {
    checkAndApply();
  }

  // Re-checa a cada 60s pra trocar de tema na meia-noite
  setInterval(checkAndApply, 60000);

  // Expoe a API pra debugging via console
  window.LandingNowThemeEngine = {
    forceCheck: checkAndApply,
    applyTheme: applyTheme,
    getCurrentSlug: function () { return currentSlug; }
  };
})();
"""

# ============================================================
# themes/namorados/theme.css - tema Dia dos Namorados
# ============================================================
NAMORADOS_CSS = """/* ============================================================
   LandingNow - Tema Dia dos Namorados (25/05 a 12/06)
   Mantem a paleta da marca (verde neon, preto, branco) intacta.
   Adiciona apenas camada secundaria em rosa/vermelho discreto.
   ============================================================ */

body.theme-namorados {
  --theme-accent: #FF4D7A;
  --theme-accent-soft: rgba(255, 77, 122, 0.12);
  --theme-bg-tint: rgba(255, 77, 122, 0.03);
  --theme-shadow: 0 12px 40px rgba(255, 77, 122, 0.18);
  --theme-border: rgba(255, 77, 122, 0.25);
  --theme-deco-display: block;
  --theme-deco-opacity: 1;
}

/* ----- LOGO: pequeno coracao ao lado do nome ----- */
body.theme-namorados .logo-wordmark::after {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-left: 4px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4D7A'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>");
  background-size: contain;
  background-repeat: no-repeat;
  animation: ln-heart-pulse 2s ease-in-out infinite;
  vertical-align: middle;
  flex-shrink: 0;
}

@keyframes ln-heart-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
}

/* ----- SECOES: leve tom rosa em seções alternadas ----- */
body.theme-namorados .roi-section,
body.theme-namorados .pricing-section,
body.theme-namorados .founder-section {
  background-image: linear-gradient(180deg, var(--theme-bg-tint) 0%, transparent 100%);
}

/* ----- CARDS: sombra com tonalidade do tema ----- */
body.theme-namorados .price-card {
  transition: box-shadow 0.4s ease, transform 0.3s ease;
}
body.theme-namorados .price-card:hover {
  box-shadow: var(--theme-shadow);
}
body.theme-namorados .price-card.featured {
  box-shadow: var(--theme-shadow), 0 0 0 1px var(--theme-border);
}

body.theme-namorados .case-card {
  transition: box-shadow 0.4s ease;
}
body.theme-namorados .case-card:hover {
  box-shadow: var(--theme-shadow);
}

body.theme-namorados .custom-card {
  box-shadow: var(--theme-shadow);
}

body.theme-namorados .float-card {
  transition: box-shadow 0.4s ease;
}
body.theme-namorados .float-card:hover {
  box-shadow: var(--theme-shadow);
}

/* ----- DECORACOES FLUTUANTES NO FUNDO ----- */
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
  bottom: -40px;
  opacity: 0;
  animation: ln-heart-float 14s linear infinite;
}

.theme-namorados-hearts .heart svg {
  width: 100%;
  height: 100%;
  fill: #FF4D7A;
  opacity: 0.55;
  filter: drop-shadow(0 4px 12px rgba(255, 77, 122, 0.3));
}

@keyframes ln-heart-float {
  0% {
    transform: translateY(0) translateX(0) rotate(-10deg);
    opacity: 0;
  }
  10% {
    opacity: 0.7;
  }
  90% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(-110vh) translateX(40px) rotate(20deg);
    opacity: 0;
  }
}

/* Posicionamento e timing dos coracoes (cada um com delay e tamanho proprio) */
.theme-namorados-hearts .heart:nth-child(1) { left: 8%;  width: 22px; height: 22px; animation-delay: 0s;   animation-duration: 18s; }
.theme-namorados-hearts .heart:nth-child(2) { left: 22%; width: 16px; height: 16px; animation-delay: 3s;   animation-duration: 14s; }
.theme-namorados-hearts .heart:nth-child(3) { left: 38%; width: 28px; height: 28px; animation-delay: 6s;   animation-duration: 20s; }
.theme-namorados-hearts .heart:nth-child(4) { left: 54%; width: 14px; height: 14px; animation-delay: 1.5s; animation-duration: 16s; }
.theme-namorados-hearts .heart:nth-child(5) { left: 70%; width: 20px; height: 20px; animation-delay: 4.5s; animation-duration: 18s; }
.theme-namorados-hearts .heart:nth-child(6) { left: 85%; width: 24px; height: 24px; animation-delay: 8s;   animation-duration: 22s; }
.theme-namorados-hearts .heart:nth-child(7) { left: 14%; width: 18px; height: 18px; animation-delay: 10s;  animation-duration: 16s; }
.theme-namorados-hearts .heart:nth-child(8) { left: 62%; width: 22px; height: 22px; animation-delay: 12s;  animation-duration: 19s; }

/* ----- SELO DE TEMA ATIVO (canto inferior direito) ----- */
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
}

.theme-namorados-badge svg {
  width: 12px;
  height: 12px;
  fill: var(--theme-accent);
}

@keyframes ln-badge-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .theme-namorados-badge {
    display: none;
  }
  .theme-namorados-hearts .heart:nth-child(n+6) {
    display: none;
  }
}

/* Respeita preferencia de movimento reduzido */
@media (prefers-reduced-motion: reduce) {
  .theme-namorados-hearts {
    display: none !important;
  }
  body.theme-namorados .logo-wordmark::after {
    animation: none !important;
  }
  .theme-namorados-badge {
    animation: none !important;
    opacity: 1;
  }
}
"""

# ============================================================
# themes/namorados/decorations.js - injeta decoracoes flutuantes
# ============================================================
NAMORADOS_JS = """/* ============================================================
   LandingNow - Tema Dia dos Namorados
   decorations.js: injeta os coracoes flutuantes e o selo de tema
   ============================================================ */

(function () {
  'use strict';

  if (document.querySelector('.theme-namorados-hearts')) return;

  // Container dos coracoes flutuantes
  const hearts = document.createElement('div');
  hearts.className = 'theme-namorados-hearts';
  hearts.setAttribute('aria-hidden', 'true');

  const heartSvg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

  // Cria 8 coracoes posicionados
  for (let i = 0; i < 8; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.innerHTML = heartSvg;
    hearts.appendChild(h);
  }

  document.body.appendChild(hearts);

  // Selo discreto no canto avisando o tema
  const badge = document.createElement('div');
  badge.className = 'theme-namorados-badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> Tema Namorados';
  document.body.appendChild(badge);

  // Limpa decoracoes se o tema mudar (re-check de medianoite)
  window.addEventListener('landingnow:theme-applied', function (e) {
    if (e.detail.slug !== 'namorados') {
      hearts.remove();
      badge.remove();
    }
  });
})();
"""

# ============================================================
# Escreve todos os arquivos
# ============================================================

files = {
    THEMES / 'base.css': BASE_CSS,
    THEMES / 'calendar.js': CALENDAR_JS,
    THEMES / 'engine.js': ENGINE_JS,
    THEMES / 'namorados' / 'theme.css': NAMORADOS_CSS,
    THEMES / 'namorados' / 'decorations.js': NAMORADOS_JS,
}

for path, content in files.items():
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content.encode('utf-8'))  # write_bytes evita BOM
    print(f'OK: {path.relative_to(ROOT)} ({len(content)} chars)')

print()
print('Estrutura criada com sucesso.')
