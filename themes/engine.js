/* ============================================================
   LandingNow - Motor de Temas Sazonais
   engine.js: detecta data atual, aplica classe no body,
   carrega CSS do tema sob demanda e injeta decoracoes.
   Re-checa a cada 60s pra trocar de tema na virada do dia
   mesmo se o usuario deixar a aba aberta.

   Modos de ativacao:
   - Automatico: pela data do navegador (padrao)
   - Preview manual: ?theme=slug na URL (ex: ?theme=namorados)
   - Console: window.LandingNowThemeEngine.applyTheme({slug:'namorados'})
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
    loadCSS('/themes/' + theme.slug + '/theme.css?v=2');

    // Carrega JS de decoracoes do tema (opcional, pode nao existir)
    loadScript('/themes/' + theme.slug + '/decorations.js?v=2').catch(function () {
      // Tema sem decoracoes JS, sem problema
    });

    currentSlug = theme.slug;

    // Dispatch event customizado pra outros scripts saberem
    window.dispatchEvent(new CustomEvent('landingnow:theme-applied', {
      detail: { slug: theme.slug, name: theme.name }
    }));
  }

  // Le preview manual via query string (?theme=namorados)
  function getPreviewSlug() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('theme');
    } catch (e) {
      return null;
    }
  }

  function checkAndApply() {
    const previewSlug = getPreviewSlug();

    // Modo preview: forca o tema indicado na URL (mesmo fora da janela de data)
    if (previewSlug) {
      applyTheme({ slug: previewSlug, name: 'Preview: ' + previewSlug });
      return;
    }

    // Modo automatico: detecta pela data
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
