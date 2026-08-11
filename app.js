/* ============================================================
   landingnow V3 · Da noite pro dia
   O scroll é o tempo: a página amanhece conforme o visitante
   avança pelos capítulos. Sem GSAP ou com movimento reduzido,
   a página vira um documento normal, legível e colorido.
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var navMenuToggle = document.getElementById('nav-menu-toggle');
  var primaryNavigation = document.getElementById('primary-navigation');

  if (navMenuToggle && primaryNavigation) {
    function closeNavigation() {
      navMenuToggle.setAttribute('aria-expanded', 'false');
      primaryNavigation.classList.remove('is-open');
    }

    navMenuToggle.addEventListener('click', function () {
      var willOpen = navMenuToggle.getAttribute('aria-expanded') !== 'true';
      navMenuToggle.setAttribute('aria-expanded', String(willOpen));
      primaryNavigation.classList.toggle('is-open', willOpen);
    });

    primaryNavigation.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNavigation);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNavigation();
    });
  }

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    docEl.classList.add('static');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  docEl.classList.add('fx');

  // No modo animado o contador parte do zero (no estático mostra 27 direto)
  var dorNumInit = document.getElementById('dorNum');
  if (dorNumInit) dorNumInit.textContent = '0';

  function vw(p) { return window.innerWidth * p; }
  function vh(p) { return window.innerHeight * p; }

  /* ============================================================
     O CÉU: uma função determinística da posição do scroll.
     Cada seção declara sua fase em data-phase; o estado do céu é
     calculado do que está sob o MEIO da viewport, com a transição
     acontecendo só na costura entre seções de fases diferentes.
     Nada de tweens concorrentes: refresh nenhum bagunça o céu, e
     o texto escuro de um capítulo de dia nunca cai em céu de noite.
     ============================================================ */

  var PHASES = {
    night: { dawn: 0, day: 0, dusk: 0, stars: 1, win: 0.9, skyline: '#070B1C' },
    dawn:  { dawn: 1, day: 0, dusk: 0, stars: 0, win: 0,   skyline: '#41557A' },
    day:   { dawn: 1, day: 1, dusk: 0, stars: 0, win: 0,   skyline: '#41557A' },
    dusk:  { dawn: 1, day: 1, dusk: 1, stars: 0, win: 0.4, skyline: '#2E3B66' }
  };

  var skySections = [];
  function measureSky() {
    skySections = [];
    document.querySelectorAll('[data-phase]').forEach(function (el) {
      var box = el.closest('.pin-spacer') || el;
      var r = box.getBoundingClientRect();
      skySections.push({
        phase: el.getAttribute('data-phase'),
        top: r.top + window.scrollY,
        bottom: r.bottom + window.scrollY
      });
    });
  }

  function applySky() {
    if (!skySections.length) return;
    var m = window.scrollY + window.innerHeight * 0.5;
    var i = 0;
    while (i < skySections.length - 1 && m >= skySections[i + 1].top) i++;
    var cur = skySections[i];
    var a = PHASES[cur.phase] || PHASES.night;
    var b = a, t = 0;
    if (i < skySections.length - 1) {
      var next = skySections[i + 1];
      if (next.phase !== cur.phase) {
        var win = Math.min(window.innerHeight * 0.85, (cur.bottom - cur.top) * 0.6);
        var startBlend = next.top - win;
        if (m > startBlend) {
          b = PHASES[next.phase] || a;
          t = Math.min(1, (m - startBlend) / (next.top - startBlend));
        }
      }
    }
    function mix(k) { return a[k] + (b[k] - a[k]) * t; }
    gsap.set('#skyDawn', { opacity: mix('dawn') });
    gsap.set('#skyDay', { opacity: mix('day') });
    gsap.set('#skyDusk', { opacity: mix('dusk') });
    gsap.set('#stars', { opacity: mix('stars') });
    gsap.set('#clouds', { opacity: mix('day') * (1 - mix('dusk')) });
    gsap.set('.horizon-windows', { opacity: mix('win') });
    docEl.style.setProperty('--skyline', gsap.utils.interpolate(a.skyline, b.skyline)(t));
  }

  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: applySky,
    onRefresh: function () { measureSky(); applySky(); }
  });
  measureSky();
  applySky();

  /* ============================================================
     O ASTRO: uma lua que se põe, um sol que nasce e se põe
     ============================================================ */

  // Lua e sol têm trajetórias próprias. O contêiner fica parado, evitando que
  // um refresh escolha um estado do outro quando a pessoa rola de volta.
  function moonStartX() { return window.innerWidth <= 680 ? vw(0.8) : vw(0.72); }
  function moonStartY() { return window.innerWidth <= 680 ? vh(0.06) : vh(0.16); }
  function moonSetX() { return window.innerWidth <= 680 ? vw(0.72) : vw(0.6); }
  function sunRiseX() { return window.innerWidth <= 680 ? vw(0.68) : vw(0.15); }
  function sunDayX() { return window.innerWidth <= 680 ? vw(0.7) : vw(0.14); }
  function sunSetX() { return window.innerWidth <= 680 ? vw(0.72) : vw(0.74); }
  function sunHorizonY() { return vh(1.08); }
  function sunDayY() { return window.innerWidth <= 680 ? vh(0.12) : vh(0.14); }

  gsap.set('#astro', { x: 0, y: 0 });
  gsap.set('#lua', { x: moonStartX(), y: moonStartY(), opacity: 1, scale: 1 });
  gsap.set('#sol', { x: sunRiseX(), y: sunHorizonY(), opacity: 0, scale: 1 });

  // Há apenas um escritor para cada astro: um estado calculado da posição do
  // scroll. Assim, um gatilho futuro nunca aplica o seu "from" fora da cena e
  // a imagem fica igual tanto na descida quanto na volta.
  var astronomy = {};
  function measureAstronomy() {
    ['dor', 'virada', 'faq', 'fim'].forEach(function (id) {
      var element = document.getElementById(id);
      var box = element && (element.closest('.pin-spacer') || element);
      if (!box) return;
      var rect = box.getBoundingClientRect();
      astronomy[id] = { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY };
    });
  }
  function progressBetween(value, start, end) {
    if (end <= start) return value >= end ? 1 : 0;
    return Math.max(0, Math.min(1, (value - start) / (end - start)));
  }
  function blend(from, to, progress) { return from + (to - from) * progress; }
  function syncAstronomy() {
    if (!astronomy.dor || !astronomy.virada || !astronomy.faq || !astronomy.fim) return;
    var y = window.scrollY;
    var h = window.innerHeight;
    var moonSet = progressBetween(y, astronomy.dor.top - h, astronomy.dor.bottom - h);
    var sunrise = progressBetween(y, astronomy.virada.top - h, astronomy.virada.top);
    // A transição final é ancorada no início do FAQ, não na altura variável dele.
    // Assim, abrir uma resposta não faz o sol subir ou o céu clarear de repente.
    var sunset = progressBetween(y, astronomy.faq.top - h * 0.35, astronomy.faq.top + h * 1.8);
    var moonFade = progressBetween(moonSet, 0.92, 1);
    var moonDuskOpacity = 0.06 + 0.94 * Math.pow(sunset, 2.4);
    var sunDuskOpacity = 1 - sunset * 0.15;

    var moonX = blend(moonStartX(), moonSetX(), moonSet);
    var moonY = blend(moonStartY(), sunHorizonY(), moonSet);
    var moonOpacity = 1 - moonFade;
    if (sunset > 0) {
      moonX = blend(moonSetX(), moonStartX(), sunset);
      moonY = blend(sunHorizonY(), moonStartY(), sunset);
      moonOpacity = moonDuskOpacity;
    }

    var sunX = blend(sunRiseX(), sunDayX(), sunrise);
    var sunY = blend(sunHorizonY(), sunDayY(), sunrise);
    var sunOpacity = sunrise;
    if (sunset > 0) {
      sunX = blend(sunDayX(), sunSetX(), sunset);
      sunY = blend(sunDayY(), sunHorizonY(), sunset);
      sunOpacity = sunDuskOpacity;
    }
    if (sunset > 0.82) {
      sunOpacity = sunDuskOpacity * (1 - progressBetween(sunset, 0.82, 1));
    }

    gsap.set('#lua', { x: moonX, y: moonY, opacity: moonOpacity, scale: 1 });
    gsap.set('#sol', { x: sunX, y: sunY, opacity: sunOpacity, scale: 1 + sunset * 0.1 });
  }
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: syncAstronomy,
    onRefresh: function () { measureAstronomy(); syncAstronomy(); }
  });
  requestAnimationFrame(function () { measureAstronomy(); syncAstronomy(); });

  /* ============================================================
     PRÓLOGO: entrada do herói + saída suave
     ============================================================ */

  var intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro.from('.ch-hero .stamp', { y: 18, opacity: 0, duration: 0.7 }, 0.1)
    .from('.hero-title', { y: 44, opacity: 0, duration: 0.9 }, 0.2)
    .from('.hero-lead', { y: 28, opacity: 0, duration: 0.8 }, 0.45)
    .from('.hero-ctas', { y: 22, opacity: 0, duration: 0.7 }, 0.6)
    .from('.hero-facts', { opacity: 0, duration: 0.7 }, 0.8)
    .from('.scroll-cue', { opacity: 0, duration: 0.8 }, 1.0);

  // A hero não escurece durante a saída: isso preserva a mesma leitura ao voltar ao topo.
  gsap.to('.scroll-cue', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#topo', start: 'top top', end: '18% top', scrub: true }
  });

  /* ============================================================
     CAPÍTULOS: desktop com pin e scrub, mobile com reveals
     ============================================================ */

  var mm = gsap.matchMedia();

  function focusProPlanOnMobile() {
    var plans = document.querySelector('.plans');
    var pro = plans && plans.children[1];
    if (!plans || !pro || window.innerWidth > 680 || plans.dataset.initialPlan === 'pro') return;
    requestAnimationFrame(function () {
      var target = pro.offsetLeft - (plans.clientWidth - pro.offsetWidth) / 2;
      plans.scrollLeft = Math.max(0, target);
      plans.dataset.initialPlan = 'pro';
    });
  }
  window.addEventListener('load', focusProPlanOnMobile, { once: true });

  mm.add('(min-width: 981px)', function () {

    /* --- Capítulo 1: a dor (cena pinada) --- */
    var dor = document.getElementById('dor');
    dor.classList.add('pin-mode');

    var beats = gsap.utils.toArray('.dor-beat');
    var dorSceneParts = gsap.utils.toArray('.dor-click-path, .dor-click, .dor-page-missing, .dor-route-break, .dor-route-x, .dor-counter');
    gsap.set(beats, { opacity: 0, y: 30 });
    gsap.set(dorSceneParts, { opacity: 0 });
    gsap.set('.dor-chip-bottom', { opacity: 0.28, y: 12 });

    var dorTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#dor', start: 'top top', end: '+=260%',
        pin: true, scrub: 0.6, anticipatePin: 1
      }
    });

    dorTl.to(beats[0], { opacity: 1, y: 0, duration: 0.6 }, 0)
      .to('.dor-click-path', { opacity: 1, duration: 0.4 }, 0.25)
      .fromTo('.dor-click', { opacity: 0, scale: 0.45 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, 0.5)
      .to(beats[0], { opacity: 0, y: -26, duration: 0.5 }, 2.2)
      .to(beats[1], { opacity: 1, y: 0, duration: 0.6 }, 2.7)
      .to('.dor-page-missing', { opacity: 1, duration: 0.55 }, 2.9)
      .to(beats[1], { opacity: 0, y: -26, duration: 0.5 }, 3.65)
      .to(beats[2], { opacity: 1, y: 0, duration: 0.6 }, 4.05)
      .to('.dor-route-break, .dor-route-x', { opacity: 1, duration: 0.35 }, 4.15)
      .to('.dor-chip-bottom', { opacity: 0.9, y: 0, duration: 0.4 }, 4.3)
      .to('.dor-counter', { opacity: 1, duration: 0.4 }, 4.5);

    /* --- Capítulo 2: a virada (a página nasce como o sol) --- */
    gsap.set('.mock', { y: '58vh' });
    gsap.set('.mock-shade', { opacity: 0.85 });
    gsap.set('.virada-item', { opacity: 0, y: 26 });

    var virTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#virada', start: 'top top', end: '+=240%',
        pin: true, scrub: 0.6, anticipatePin: 1
      }
    });
    virTl.to('.mock', { y: 0, ease: 'power1.out', duration: 2 }, 0)
      .to('.mock-shade', { opacity: 0, duration: 1.2 }, 0.9)
      .to('.virada-item', { opacity: 1, y: 0, duration: 0.55, stagger: 0.5 }, 1.5);

    /* --- Capítulo 3: a prova (trilho horizontal) --- */
    var prova = document.getElementById('prova');
    prova.classList.add('rail');
    var track = document.querySelector('.cases-track');
    function railDist() { return Math.max(0, track.scrollWidth - window.innerWidth); }

    gsap.to(track, {
      x: function () { return -railDist(); },
      ease: 'none',
      scrollTrigger: {
        trigger: '#prova', start: 'top top',
        end: function () { return '+=' + (railDist() + vh(0.4)); },
        pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1
      }
    });

    return function () {
      dor.classList.remove('pin-mode');
      prova.classList.remove('rail');
    };
  });

  mm.add('(max-width: 980px)', function () {

    /* --- Capítulo 1: beats empilhados com reveal --- */
    gsap.utils.toArray('.dor-beat').forEach(function (b) {
      gsap.from(b, {
        opacity: 0, y: 26, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: b, start: 'top 88%', once: true }
      });
    });

    // No mobile, o painel fica legível sem depender de um gatilho de animação.
    /* --- Capítulo 2: a página sobe sem pin --- */
    gsap.from('.mock', {
      y: 70, opacity: 0, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: '.mock', start: 'top 90%', once: true }
    });
    gsap.utils.toArray('.virada-item').forEach(function (item, i) {
      gsap.from(item, {
        opacity: 0, y: 24, duration: 0.6, delay: (i % 4) * 0.06, ease: 'power2.out',
        scrollTrigger: { trigger: item, start: 'top 92%', once: true }
      });
    });

    return function () {};
  });

  /* ============================================================
     REVEALS LEVES (todos os tamanhos)
     ============================================================ */

  gsap.utils.toArray('.stat').forEach(function (el, i) {
    gsap.from(el, {
      opacity: 0, y: 22, duration: 0.6, delay: i * 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });
  gsap.utils.toArray('.plan').forEach(function (el, i) {
    gsap.from(el, {
      opacity: 0, y: 30, duration: 0.65, delay: (i % 4) * 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });
  gsap.utils.toArray('.offer-team-note, .plan-guide, .quem-foto, .quem-texto, .plans-note, .faq-item').forEach(function (el) {
    gsap.from(el, {
      opacity: 0, y: 24, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });
  gsap.from('.ch-final .ch-frame', {
    opacity: 0, y: 34, duration: 0.8, ease: 'power2.out',
    scrollTrigger: { trigger: '#final', start: 'top 75%', once: true }
  });

  /* ============================================================
     AJUSTES FINOS
     ============================================================ */

  // Recalcula posições depois que as fontes carregam
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  // Os detalhes dos planos mudam o fluxo da oferta. Já o FAQ não deve forçar um
  // refresh global, pois isso reposiciona a pessoa e faz o céu parecer voltar no tempo.
  gsap.utils.toArray('details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.closest('#faq')) return;
      ScrollTrigger.refresh();
    });
  });
})();
