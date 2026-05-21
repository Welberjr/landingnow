/* ============================================================
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
