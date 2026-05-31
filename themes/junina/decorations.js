/* ============================================================
   LandingNow - Tema Festa Junina v2 FULL+IMG
   decorations.js: copy elegante (vende/dorme, conquistar cliente)
   + footer com 3 highlights (fogueira, balao, sanfona).
   Cordao de bandeirinhas e cordao gigante removidos - agora vem
   diretamente das imagens fotorrealisticas no background.
   ============================================================ */

(function () {
  'use strict';

  if (document.querySelector('.theme-junina-stars')) return;

  // -----------------------------------------------------------
  // SVGs - tudo inline pra nao depender de arquivos externos
  // -----------------------------------------------------------
  const STAR =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 2 L14.5 9 L22 9 L16 13.5 L18 21 L12 17 L6 21 L8 13.5 L2 9 L9.5 9 Z"/>' +
    '</svg>';

  const STRAW_HAT =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="12" cy="17" rx="10" ry="2.5" fill="#D4A574"/>' +
      '<path d="M 7 17 C 7 12, 8 8, 12 8 C 16 8, 17 12, 17 17 Z" fill="#C49A5C"/>' +
      '<rect x="7" y="14" width="10" height="1.5" fill="#E63946"/>' +
    '</svg>';

  // Icone fogueira
  const ICON_BONFIRE =
    '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M 24 6 C 19 14, 24 20, 21 26 C 21 29, 18 32, 21 38 L 27 38 C 30 32, 27 29, 27 26 C 24 20, 29 14, 24 6 Z" fill="#FF8C00" opacity="0.95"/>' +
      '<path d="M 24 12 C 22 18, 26 22, 24 27 C 24 29, 23 32, 24 34 L 25 34 C 26 32, 25 29, 25 27 C 25 22, 26 18, 24 12 Z" fill="#FFD23F"/>' +
      '<rect x="15" y="38" width="18" height="3" fill="#6B3410" transform="rotate(-8 24 39.5)"/>' +
      '<rect x="13" y="41" width="22" height="3" fill="#5A2A0A" transform="rotate(6 24 42.5)"/>' +
      '<circle cx="14" cy="22" r="1" fill="#FF8C00" opacity="0.6"/>' +
      '<circle cx="34" cy="18" r="1" fill="#FF8C00" opacity="0.6"/>' +
      '<circle cx="36" cy="28" r="0.8" fill="#FFD23F" opacity="0.7"/>' +
      '<circle cx="12" cy="32" r="0.8" fill="#FFD23F" opacity="0.7"/>' +
    '</svg>';

  // Icone balao de Sao Joao
  const ICON_BALLOON =
    '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M 24 6 C 12 6, 9 18, 12 27 C 15 33, 24 36, 24 36 C 24 36, 33 33, 36 27 C 39 18, 36 6, 24 6 Z" fill="#FF6B1A"/>' +
      '<path d="M 16 10 C 16 18, 16 27, 19 33" stroke="#FFD23F" stroke-width="1.2" fill="none"/>' +
      '<path d="M 24 8 C 24 16, 24 28, 24 36" stroke="#FFD23F" stroke-width="1.2" fill="none"/>' +
      '<path d="M 32 10 C 32 18, 32 27, 29 33" stroke="#FFD23F" stroke-width="1.2" fill="none"/>' +
      '<path d="M 18 14 L 30 14" stroke="#E63946" stroke-width="1" opacity="0.7"/>' +
      '<path d="M 16 22 L 32 22" stroke="#E63946" stroke-width="1" opacity="0.7"/>' +
      '<rect x="21" y="36" width="6" height="4" fill="#6B3410"/>' +
      '<line x1="22" y1="40" x2="22" y2="44" stroke="#6B3410" stroke-width="0.8"/>' +
      '<line x1="26" y1="40" x2="26" y2="44" stroke="#6B3410" stroke-width="0.8"/>' +
    '</svg>';

  // Icone sanfona
  const ICON_ACCORDION =
    '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="4" y="12" width="10" height="24" fill="#E63946" rx="1.5"/>' +
      '<rect x="34" y="12" width="10" height="24" fill="#E63946" rx="1.5"/>' +
      '<path d="M 14 13 L 17 16 L 14 19 L 17 22 L 14 25 L 17 28 L 14 31 L 17 34 L 14 35" stroke="#D4A574" stroke-width="1.8" fill="none"/>' +
      '<path d="M 34 13 L 31 16 L 34 19 L 31 22 L 34 25 L 31 28 L 34 31 L 31 34 L 34 35" stroke="#D4A574" stroke-width="1.8" fill="none"/>' +
      '<line x1="17" y1="17" x2="31" y2="17" stroke="#8B6F4A" stroke-width="0.8" opacity="0.7"/>' +
      '<line x1="17" y1="24" x2="31" y2="24" stroke="#8B6F4A" stroke-width="0.8" opacity="0.7"/>' +
      '<line x1="17" y1="31" x2="31" y2="31" stroke="#8B6F4A" stroke-width="0.8" opacity="0.7"/>' +
      '<circle cx="7" cy="17" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="11" cy="17" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="7" cy="22" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="11" cy="22" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="38" cy="18" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="41" cy="18" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="38" cy="22" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="41" cy="22" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="38" cy="26" r="1.2" fill="#FFD23F"/>' +
      '<circle cx="41" cy="26" r="1.2" fill="#FFD23F"/>' +
    '</svg>';

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
    heroTag.innerHTML = '<span>Edição Especial Festa Junina</span>';
  }

  // -----------------------------------------------------------
  // 2. HERO - H1: vende em destaque, dorme riscado
  // -----------------------------------------------------------
  setHTML('.hero h1',
    'Sua página que <span class="accent-word">vende</span><br>' +
    'enquanto você <span class="strikethrough">dorme.</span>'
  );

  // -----------------------------------------------------------
  // 3. HERO - lead text
  // -----------------------------------------------------------
  setHTML('.hero p.lead',
    'Landing pages profissionais com foco total em conversão direta no <strong style="color:var(--ink)">WhatsApp</strong>. Estratégia, design e domínio próprio configurado, tudo pronto pra você começar a faturar.'
  );

  // -----------------------------------------------------------
  // 4. HERO - CTAs
  // -----------------------------------------------------------
  const primaryCta = document.querySelector('.hero-ctas .btn-primary');
  if (primaryCta) {
    const svg = primaryCta.querySelector('svg');
    primaryCta.innerHTML = '';
    if (svg) primaryCta.appendChild(svg);
    primaryCta.appendChild(document.createTextNode(' Quero minha página agora'));
  }
  const secondaryCta = document.querySelector('.hero-ctas .btn-secondary');
  if (secondaryCta) {
    secondaryCta.textContent = 'Ver o que ta incluso →';
  }

  // -----------------------------------------------------------
  // 5. HERO - cards (4 normais + 1 featured)
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
      '  <div class="float-card-icon">📱</div>',
      '  <div>',
      '    <span class="card-title">Otimizada pra mobile</span>',
      '    <span class="card-sub">Experiência perfeita em qualquer tela.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card featured">',
      '  <div class="float-card-icon">💬</div>',
      '  <div>',
      '    <span class="card-title">Botão WhatsApp direto</span>',
      '    <span class="card-sub">Fale com você em 1 clique.</span>',
      '  </div>',
      '</div>',
      '<div class="float-card">',
      '  <div class="float-card-icon">🎯</div>',
      '  <div>',
      '    <span class="card-title">Foco em conversão</span>',
      '    <span class="card-sub">Estratégia voltada pra resultado.</span>',
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
      '<span>Mais de <strong>70 marcas</strong> já conquistaram resultados com a gente.</span>' +
      '<span class="trust-star">' + STAR + '</span>';
    /* trust "70 marcas" removido a pedido do Welber - a barra de numeros assumiu esse espaco */
  }

  // -----------------------------------------------------------
  // 7. MARQUEE - mensagens comerciais (sem forcar tema)
  // -----------------------------------------------------------
  const marqueeMessages = [
    'landings que vendem 24/7',
    'entrega a partir de 48h',
    'copy que converte',
    '100% mobile',
    'domínio próprio incluso'
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
  setHTML('.cases-section h2', 'Trabalhos que <em class="italic">conquistaram clientes.</em>');
  setHTML('.cases-section .cases-cta h3', 'Quer ver seu negócio na <em>próxima conquista?</em>');
  const casesCtaLink = document.querySelector('.cases-section .cases-cta .btn-neon');
  if (casesCtaLink) casesCtaLink.textContent = 'Quero a minha conquista →';

  // -----------------------------------------------------------
  // 9. ROI CALCULATOR
  // -----------------------------------------------------------
  setHTML('.roi-section h2', 'Quantos clientes você precisa <em class="italic">pra alcancar sua meta?</em>');

  // -----------------------------------------------------------
  // 10. PRICING - titulo tematico
  // -----------------------------------------------------------
  setHTML('.pricing-section h2', 'Quatro caminhos pra <em class="italic">conquistar</em> seu cliente.');

  // -----------------------------------------------------------
  // 11. FOUNDER
  // -----------------------------------------------------------
  setHTML('.founder-section h2',
    'Você não tá contratando uma agência. Ta contratando <em>quem coloca a mao na massa.</em>'
  );

  // -----------------------------------------------------------
  // 12. FINAL CTA
  // -----------------------------------------------------------
  setHTML('.final-cta h2', 'Bora <em>conquistar</em><br>mais clientes?');
  setText('.final-cta p', 'Sua próxima página, no ar a partir de 48h. A partir de R$ 99,90.');

  // -----------------------------------------------------------
  // 13. SEASONAL ADDON
  // -----------------------------------------------------------
  setHTML('.seasonal-addon h3',
    'Sua landing muda de cara <em>em cada data comemorativa.</em>'
  );

  // -----------------------------------------------------------
  // 14. ESTRELINHAS AMARELAS FLUTUANTES (sobre a imagem)
  // -----------------------------------------------------------
  const stars = document.createElement('div');
  stars.className = 'theme-junina-stars';
  stars.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.innerHTML = STAR;
    stars.appendChild(s);
  }
  document.body.appendChild(stars);

  // -----------------------------------------------------------
  // 15. SELO DE TEMA - canto inferior direito
  // -----------------------------------------------------------
  if (!document.querySelector('.theme-junina-badge')) {
    const badge = document.createElement('div');
    badge.className = 'theme-junina-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = STRAW_HAT + ' Tema Festa Junina';
    document.body.appendChild(badge);
  }

  // -----------------------------------------------------------
  // 16. PRICING - tag + subtitulo
  // -----------------------------------------------------------
  const pricingHeader = document.querySelector('.pricing-section .section-header');
  if (pricingHeader && !pricingHeader.querySelector('.theme-junina-pricing-tag')) {
    const tag = document.createElement('div');
    tag.className = 'theme-junina-pricing-tag';
    tag.innerHTML = STRAW_HAT + ' Edição Especial Festa Junina';
    pricingHeader.appendChild(tag);

    // Subtitulo abaixo do h2
    if (!pricingHeader.querySelector('.theme-junina-pricing-subtitle')) {
      const sub = document.createElement('p');
      sub.className = 'theme-junina-pricing-subtitle';
      sub.textContent = 'Escolha o plano que combina com o estágio do seu negócio. O pagamento é via Pix, com 50% pra iniciar e 50% na entrega.';
      pricingHeader.appendChild(sub);
    }
  }

  // -----------------------------------------------------------
  // 17. PRICING - footer dos 3 highlights (fogueira + balao + sanfona)
  // -----------------------------------------------------------
  const pricingContainer = document.querySelector('.pricing-section .container');
  if (pricingContainer && !document.querySelector('.theme-junina-highlights')) {
    const highlights = document.createElement('div');
    highlights.className = 'theme-junina-highlights';
    highlights.innerHTML = [
      '<div class="highlight">',
      '  <div class="highlight-icon">' + ICON_BONFIRE + '</div>',
      '  <div>Páginas que vendem enquanto você <strong>aproveita o arraia.</strong></div>',
      '</div>',
      '<div class="highlight">',
      '  <div class="highlight-icon">' + ICON_BALLOON + '</div>',
      '  <div>Performance que <strong>não</strong> tira ferias.</div>',
      '</div>',
      '<div class="highlight">',
      '  <div class="highlight-icon">' + ICON_ACCORDION + '</div>',
      '  <div>Resultados que fazem qualquer negócio <strong>dancar quadrilha.</strong></div>',
      '</div>'
    ].join('\n');
    pricingContainer.appendChild(highlights);
  }

  // -----------------------------------------------------------
  // 18. Cleanup ao trocar de tema
  // -----------------------------------------------------------
  window.addEventListener('landingnow:theme-applied', function (e) {
    if (e.detail.slug !== 'junina') {
      const toRemove = document.querySelectorAll(
        '.theme-junina-stars, .theme-junina-badge, .theme-junina-trust, ' +
        '.theme-junina-pricing-tag, .theme-junina-pricing-subtitle, .theme-junina-highlights'
      );
      toRemove.forEach(function (el) { el.remove(); });
    }
  });
})();
