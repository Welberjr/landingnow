/* ============================================================
   Google Analytics 4 + Microsoft Clarity, carregados de forma
   segura: somente em produção (hosts conhecidos), somente quando
   o ID existir em window.LN_CONFIG, sem duplicação e adiados pra
   depois da primeira pintura (mesmo padrão do Meta Pixel).
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.LN_CONFIG || {};
  var PROD_HOSTS = ['landingnow-v3.pages.dev', 'landingnow.com.br', 'www.landingnow.com.br'];
  if (PROD_HOSTS.indexOf(window.location.hostname) === -1) return;

  function loadGA() {
    var id = cfg.GA_MEASUREMENT_ID;
    if (!id || window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id, { anonymize_ip: true });
  }

  function loadClarity() {
    var id = cfg.CLARITY_PROJECT_ID;
    if (!id || window.__clarityLoaded) return;
    window.__clarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', id);
  }

  function boot() {
    loadGA();
    loadClarity();
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(boot, { timeout: 4000 });
  } else {
    setTimeout(boot, 2500);
  }
})();
