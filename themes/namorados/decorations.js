/* ============================================================
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
    heroTag.innerHTML = '<span>Edição Especial Dia dos Namorados</span>';
  }

  // -----------------------------------------------------------
  // 3. HERO - H1 com palavra "clientes" em destaque e "apaixonarem" riscado
  // -----------------------------------------------------------
  setHTML('.hero h1',
    'Sua página faz seus <span class="accent-word">clientes</span><br>' +
    'se <span class="strikethrough">apaixonarem.</span>'
  );

  // -----------------------------------------------------------
  // 4. HERO - lead text (sem travessao)
  // -----------------------------------------------------------
  setHTML('.hero p.lead',
    'Landing pages profissionais com foco total em conversão direta no <strong style="color:var(--ink)">WhatsApp</strong>. Estratégia, design e domínio próprio configurado, tudo pronto pra você vender mais todos os dias.'
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
    secondaryCta.textContent = 'Ver o que tá incluso →';
  }

  // -----------------------------------------------------------
  // 6. HERO - cards do lado direito (4 + 1 destaque verde)
  // -----------------------------------------------------------
  const heroCards = document.querySelector('.hero-cards');
  if (heroCards) {
    heroCards.innerHTML = [
      '<div class="float-card">',
      '  <div class="float-card-icon">⚡</div>',
      '  <div>',
      '    <span class="card-title">Entrega a partir de 72h</span>',
      '    <span class="card-sub">Seu projeto no ar rapidinho.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card">',
      '  <div class="float-card-icon">♥</div>',
      '  <div>',
      '    <span class="card-title">Design que gera desejo</span>',
      '    <span class="card-sub">Visual irresistível que conecta.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card">',
      '  <div class="float-card-icon">📱</div>',
      '  <div>',
      '    <span class="card-title">Otimizada pra mobile</span>',
      '    <span class="card-sub">Experiência perfeita em qualquer tela.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card">',
      '  <div class="float-card-icon">🎯</div>',
      '  <div>',
      '    <span class="card-title">Conversão que conquista</span>',
      '    <span class="card-sub">Estratégia focada no que importa: resultados.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card featured">',
      '  <div class="float-card-icon">💬</div>',
      '  <div>',
      '    <span class="card-title">Botão WhatsApp direto</span>',
      '    <span class="card-sub">Fale com você em 1 clique.</span>',
      '  </div>',
      '</div>'
    ].join('\n');
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
      '<span>Mais de <strong>70 marcas</strong> já conquistaram resultados com a gente.</span>' +
      '<span class="trust-heart">' + HEART_OUTLINE + '</span>';
    /* trust "70 marcas" removido a pedido do Welber - a barra de numeros assumiu esse espaco */
  }

  // -----------------------------------------------------------
  // 8. MARQUEE - mensagens tematicas
  // -----------------------------------------------------------
  const marqueeMessages = [
    'landings que apaixonam clientes',
    'entrega a partir de 72h',
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
  setHTML('.cases-section .cases-cta h3', 'Quer ver seu negócio na <em>próxima conquista?</em>');
  const casesCtaLink = document.querySelector('.cases-section .cases-cta .btn-neon');
  if (casesCtaLink) casesCtaLink.textContent = 'Quero conquistar a minha →';

  // -----------------------------------------------------------
  // 10. ROI CALCULATOR - titulo e descricao
  // -----------------------------------------------------------
  setHTML('.roi-section h2', 'Quantos clientes você precisa <em class="italic">pra conquistar sua meta?</em>');

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
    'Você não tá contratando uma agência. Tá contratando <em>uma pessoa apaixonada pelo que faz.</em>'
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
  setText('.final-cta p', 'Sua próxima página, no ar a partir de 72h. A partir de R$ 297.');

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
  // v3 - Reforco na secao pricing
  // -----------------------------------------------------------
  const pricingHeader = document.querySelector('.pricing-section .section-header');
  if (pricingHeader && !pricingHeader.querySelector('.theme-namorados-pricing-tag')) {
    const tag = document.createElement('div');
    tag.className = 'theme-namorados-pricing-tag';
    tag.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> Edição Especial Dia dos Namorados';
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
      '<span>Mais do que páginas, criamos experiências que <strong>conquistam.</strong></span>' +
      '<span class="pricing-trust-divider"></span>' +
      '<span>Feito com foco em <strong>conversão.</strong></span>' +
      '<span class="pricing-trust-heart">' + HEART_FILL + '</span>';
    pricingContainer.appendChild(trust);
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
