/* ============================================================
   LandingNow - Tema Festa Junina v1 FULL
   decorations.js: substitui copy do hero e secoes, injeta cards
   estilizados, cordao de bandeirinhas no topo, estrelinhas
   flutuantes, trust signal, cordao gigante na pricing e selo.
   ============================================================ */

(function () {
  'use strict';

  if (document.querySelector('.theme-junina-cordao')) return;

  // SVGs usados em logo, marquee, cards e decoracoes
  const STAR = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 L14.5 9 L22 9 L16 13.5 L18 21 L12 17 L6 21 L8 13.5 L2 9 L9.5 9 Z"/></svg>';

  // Cores das bandeirinhas (rotacao em 5 cores)
  const FLAG_COLORS = ['#E63946', '#FFD23F', '#1D9BF0', '#52B788', '#E07AAA'];

  // SVG de bandeirinha individual (triangulo de cabeca pra baixo)
  function bandeirinhaSVG(color) {
    return '<svg viewBox="0 0 26 32" xmlns="http://www.w3.org/2000/svg">' +
           '<path d="M3 8 L23 8 L13 30 Z" fill="' + color + '"/>' +
           '</svg>';
  }

  // -----------------------------------------------------------
  // Helpers
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
  // 1. HERO - tag superior
  // -----------------------------------------------------------
  const heroTag = document.querySelector('.hero-tag');
  if (heroTag) {
    heroTag.innerHTML = '<span>Edicao especial Festa Junina</span>';
  }

  // -----------------------------------------------------------
  // 2. HERO - H1 com "galera" em destaque e "arraiá" riscado
  // -----------------------------------------------------------
  setHTML('.hero h1',
    'Sua pagina arrasta a <span class="accent-word">galera</span><br>' +
    'pro <span class="strikethrough">arraia.</span>'
  );

  // -----------------------------------------------------------
  // 3. HERO - lead text
  // -----------------------------------------------------------
  setHTML('.hero p.lead',
    'Landing pages profissionais com foco total em conversao direta no <strong style="color:var(--ink)">WhatsApp</strong>. Estrategia, design e dominio proprio configurado, tudo pronto pra encher seu arraial todo dia.'
  );

  // -----------------------------------------------------------
  // 4. HERO - CTAs
  // -----------------------------------------------------------
  const primaryCta = document.querySelector('.hero-ctas .btn-primary');
  if (primaryCta) {
    const svg = primaryCta.querySelector('svg');
    primaryCta.innerHTML = '';
    if (svg) primaryCta.appendChild(svg);
    primaryCta.appendChild(document.createTextNode(' Quero arrastar mais clientes'));
  }
  const secondaryCta = document.querySelector('.hero-ctas .btn-secondary');
  if (secondaryCta) {
    secondaryCta.textContent = 'Ver o que ta no menu →';
  }

  // -----------------------------------------------------------
  // 5. HERO - cards do lado direito (4 + 1 destaque verde)
  // -----------------------------------------------------------
  const heroCards = document.querySelector('.hero-cards');
  if (heroCards) {
    heroCards.innerHTML = [
      '<div class="float-card">',
      '  <div class="float-card-icon">⚡</div>',
      '  <div>',
      '    <span class="card-title">Entrega a partir de 48h</span>',
      '    <span class="card-sub">Seu projeto no ar rapidinho.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card">',
      '  <div class="float-card-icon">★</div>',
      '  <div>',
      '    <span class="card-title">Design que faz a festa</span>',
      '    <span class="card-sub">Visual que chama todo mundo.</span>',
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
      '    <span class="card-title">Conversao que arrasta</span>',
      '    <span class="card-sub">Estrategia focada em encher a roda.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card featured">',
      '  <div class="float-card-icon">💬</div>',
      '  <div>',
      '    <span class="card-title">Botao WhatsApp direto</span>',
      '    <span class="card-sub">Quentao na conversa em 1 clique.</span>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // -----------------------------------------------------------
  // 6. TRUST SIGNAL abaixo do hero
  // -----------------------------------------------------------
  const heroSection = document.querySelector('.hero');
  if (heroSection && !document.querySelector('.theme-junina-trust')) {
    const container = heroSection.querySelector('.container') || heroSection;
    const trust = document.createElement('div');
    trust.className = 'theme-junina-trust';
    trust.innerHTML =
      '<span class="trust-star">' + STAR + '</span>' +
      '<span>Mais de <strong>70 marcas</strong> ja conquistaram resultados com a gente.</span>' +
      '<span class="trust-star">' + STAR + '</span>';
    container.appendChild(trust);
  }

  // -----------------------------------------------------------
  // 7. MARQUEE - mensagens tematicas
  // -----------------------------------------------------------
  const marqueeMessages = [
    'landings que arrastam clientes',
    'entrega em ate 5 dias',
    'copy que faz vender',
    '100% mobile',
    'design que junta o povo'
  ];
  const marquee = document.querySelector('.marquee');
  if (marquee) {
    const spans = marquee.querySelectorAll('span');
    spans.forEach(function (s, i) {
      s.textContent = marqueeMessages[i % marqueeMessages.length];
    });
  }

  // -----------------------------------------------------------
  // 8. CASES - titulo, descricao, CTA
  // -----------------------------------------------------------
  setHTML('.cases-section h2', 'Trabalhos que <em class="italic">arrastaram a clientela.</em>');
  setHTML('.cases-section .cases-cta h3', 'Quer ver seu negocio na <em>proxima arrastada?</em>');
  const casesCtaLink = document.querySelector('.cases-section .cases-cta .btn-neon');
  if (casesCtaLink) casesCtaLink.textContent = 'Quero entrar na festa →';

  // -----------------------------------------------------------
  // 9. ROI CALCULATOR - titulo
  // -----------------------------------------------------------
  setHTML('.roi-section h2', 'Quantos clientes voce precisa <em class="italic">pra fazer sua festa?</em>');

  // -----------------------------------------------------------
  // 10. PRICING - titulo tematico
  // -----------------------------------------------------------
  setHTML('.pricing-section h2', 'Quatro caminhos pra <em class="italic">encher seu arraial.</em>');

  // -----------------------------------------------------------
  // 11. FOUNDER - titulo
  // -----------------------------------------------------------
  setHTML('.founder-section h2',
    'Voce nao ta contratando uma agencia. Ta contratando <em>quem coloca a mao na massa.</em>'
  );

  // -----------------------------------------------------------
  // 12. FINAL CTA - titulo com gradient
  // -----------------------------------------------------------
  setHTML('.final-cta h2', 'Bora <em>encher</em><br>de cliente?');
  setText('.final-cta p', 'Sua proxima pagina, no ar a partir de 48h. A partir de R$ 99,90.');

  // -----------------------------------------------------------
  // 13. SEASONAL ADDON - copy tematico
  // -----------------------------------------------------------
  setHTML('.seasonal-addon h3',
    'Sua landing muda de cara <em>em cada data comemorativa.</em>'
  );

  // -----------------------------------------------------------
  // 14. CORDAO DE BANDEIRINHAS NO TOPO DA VIEWPORT
  // -----------------------------------------------------------
  if (!document.querySelector('.theme-junina-cordao')) {
    const cordao = document.createElement('div');
    cordao.className = 'theme-junina-cordao';
    cordao.setAttribute('aria-hidden', 'true');

    const N_BANDEIRINHAS = 16;
    for (let i = 0; i < N_BANDEIRINHAS; i++) {
      const b = document.createElement('div');
      b.className = 'bandeirinha';
      const color = FLAG_COLORS[i % FLAG_COLORS.length];
      b.innerHTML = bandeirinhaSVG(color);
      cordao.appendChild(b);
    }
    document.body.appendChild(cordao);
  }

  // -----------------------------------------------------------
  // 15. ESTRELINHAS AMARELAS FLUTUANTES (substitui coracoes subindo)
  // -----------------------------------------------------------
  const stars = document.createElement('div');
  stars.className = 'theme-junina-stars';
  stars.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.innerHTML = STAR;
    stars.appendChild(s);
  }
  document.body.appendChild(stars);

  // -----------------------------------------------------------
  // 16. SELO DE TEMA - canto inferior direito
  // -----------------------------------------------------------
  if (!document.querySelector('.theme-junina-badge')) {
    const badge = document.createElement('div');
    badge.className = 'theme-junina-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = STAR + ' Tema Festa Junina';
    document.body.appendChild(badge);
  }

  // -----------------------------------------------------------
  // 17. PRICING - tag tematica
  // -----------------------------------------------------------
  const pricingHeader = document.querySelector('.pricing-section .section-header');
  if (pricingHeader && !pricingHeader.querySelector('.theme-junina-pricing-tag')) {
    const tag = document.createElement('div');
    tag.className = 'theme-junina-pricing-tag';
    tag.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M12 2 L14.5 9 L22 9 L16 13.5 L18 21 L12 17 L6 21 L8 13.5 L2 9 L9.5 9 Z"/></svg>' +
      ' Edicao Especial Festa Junina';
    pricingHeader.appendChild(tag);
  }

  // -----------------------------------------------------------
  // 18. PRICING - cordao gigante decorativo (canto superior direito)
  // ------------------------------------------------------------
  const pricingSec = document.querySelector('.pricing-section');
  if (pricingSec && !pricingSec.querySelector('.theme-junina-giant-cordao')) {
    const giant = document.createElement('div');
    giant.className = 'theme-junina-giant-cordao';
    giant.setAttribute('aria-hidden', 'true');

    // SVG: cordao curvo com 9 bandeirinhas penduradas alternando cores
    const COLORS = FLAG_COLORS;
    let bandeirasSVG = '';
    // 9 pontos ao longo da curva
    for (let i = 0; i < 9; i++) {
      const t = i / 8;                       // 0..1
      const x = 40 + t * 380;                // posicao horizontal
      const y = 40 + Math.sin(t * Math.PI * 1.4) * 40 + (1 - t) * 28;  // curva
      const color = COLORS[i % COLORS.length];
      // Cordinha (linha fina ate o topo da bandeirinha)
      bandeirasSVG += '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + 14) + '" stroke="#FFD23F" stroke-width="1.5" opacity="0.7"/>';
      // Triangulo apontando pra baixo
      bandeirasSVG += '<path d="M ' + (x - 16) + ' ' + (y + 14) + ' L ' + (x + 16) + ' ' + (y + 14) + ' L ' + x + ' ' + (y + 56) + ' Z" fill="' + color + '" opacity="0.95"/>';
    }
    // Cordinha contínua passando pelos topos
    let cordaPath = 'M 40 40';
    for (let i = 1; i < 9; i++) {
      const t = i / 8;
      const x = 40 + t * 380;
      const y = 40 + Math.sin(t * Math.PI * 1.4) * 40 + (1 - t) * 28;
      cordaPath += ' L ' + x + ' ' + y;
    }
    const cordaLine = '<path d="' + cordaPath + '" stroke="#FFD23F" stroke-width="2" fill="none" opacity="0.7"/>';

    // Estrelinhas decorativas no SVG
    const sparkles =
      '<circle cx="80" cy="160" r="2.5" fill="#FFD23F" opacity="0.7"/>' +
      '<circle cx="240" cy="220" r="2" fill="#FFD23F" opacity="0.6"/>' +
      '<circle cx="380" cy="180" r="2.5" fill="#FFD23F" opacity="0.5"/>' +
      '<circle cx="160" cy="260" r="1.8" fill="#FFD23F" opacity="0.6"/>';

    giant.innerHTML =
      '<svg viewBox="0 0 460 320" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<filter id="ln-junina-glow" x="-50%" y="-50%" width="200%" height="200%">' +
          '<feGaussianBlur stdDeviation="3" result="blur"/>' +
          '<feMerge>' +
            '<feMergeNode in="blur"/>' +
            '<feMergeNode in="SourceGraphic"/>' +
          '</feMerge>' +
        '</filter>' +
      '</defs>' +
      '<g filter="url(#ln-junina-glow)">' +
        cordaLine +
        bandeirasSVG +
      '</g>' +
      sparkles +
      '</svg>';
    pricingSec.appendChild(giant);
  }

  // -----------------------------------------------------------
  // 19. PRICING - trust signal no rodape
  // -----------------------------------------------------------
  const pricingContainer = document.querySelector('.pricing-section .container');
  if (pricingContainer && !document.querySelector('.theme-junina-pricing-trust')) {
    const trust = document.createElement('div');
    trust.className = 'theme-junina-pricing-trust';
    trust.innerHTML =
      '<span class="pricing-trust-star">' + STAR + '</span>' +
      '<span>Mais do que paginas, criamos experiencias que <strong>arrastam.</strong></span>' +
      '<span class="pricing-trust-divider"></span>' +
      '<span>Feito com foco em <strong>conversao.</strong></span>' +
      '<span class="pricing-trust-star">' + STAR + '</span>';
    pricingContainer.appendChild(trust);
  }

  // -----------------------------------------------------------
  // 20. Cleanup ao trocar de tema
  // -----------------------------------------------------------
  window.addEventListener('landingnow:theme-applied', function (e) {
    if (e.detail.slug !== 'junina') {
      const toRemove = document.querySelectorAll(
        '.theme-junina-cordao, .theme-junina-stars, .theme-junina-badge, ' +
        '.theme-junina-trust, .theme-junina-pricing-tag, .theme-junina-giant-cordao, ' +
        '.theme-junina-pricing-trust'
      );
      toRemove.forEach(function (el) { el.remove(); });
    }
  });
})();
