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

  // No celular a lua começa mais alta e mais à direita pra não encostar no título
  function luaX() { return window.innerWidth <= 680 ? vw(0.8) : vw(0.72); }
  function luaY() { return window.innerWidth <= 680 ? vh(0.06) : vh(0.16); }

  gsap.set('#astro', { x: luaX(), y: luaY() });

  // Segmentos da viagem do astro, na ordem do scroll (pra reposicionar após cada refresh)
  var astroSegs = [];

  // A lua desce ao longo do capítulo da dor. No celular ela quase não
  // sai do alto do céu: fica de fundo, sem passar por cima do texto.
  astroSegs.push(gsap.fromTo('#astro',
    { x: luaX, y: luaY },
    {
      x: function () { return window.innerWidth <= 680 ? vw(0.86) : vw(0.58); },
      y: function () { return window.innerWidth <= 680 ? vh(0.14) : vh(0.68); },
      ease: 'none', immediateRender: false,
      scrollTrigger: {
        trigger: '#dor', start: 'top bottom', end: 'bottom bottom',
        scrub: true, invalidateOnRefresh: true
      }
    }));

  // A lua some quando o amanhecer chega
  gsap.fromTo('#lua', { opacity: 1 }, {
    opacity: 0, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: '#virada', start: 'top bottom', end: 'top 55%', scrub: true }
  });

  // O sol nasce durante a virada. No desktop ele sobe ATRÁS do mockup
  // da página (vira um halo nas bordas do card escuro) e nunca cruza a
  // coluna de argumentos à direita; no tablet/celular, onde os itens
  // ficam abaixo da dobra, mantém a subida central.
  function solRiseX() { return window.innerWidth > 980 ? vw(0.24) : vw(0.46); }
  astroSegs.push(gsap.fromTo('#astro',
    { x: function () { return vw(0.42); }, y: function () { return vh(1.08); } },
    {
      x: solRiseX, y: function () { return vh(0.2); },
      ease: 'none', immediateRender: false,
      scrollTrigger: {
        trigger: '#virada', start: 'top top', end: 'bottom top',
        scrub: true, invalidateOnRefresh: true
      }
    }));
  gsap.fromTo('#sol', { opacity: 0 }, {
    opacity: 1, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: '#virada', start: 'top top', end: '+=40%', scrub: true }
  });

  // O sol atravessa o dia devagar
  astroSegs.push(gsap.fromTo('#astro',
    { x: solRiseX, y: function () { return vh(0.2); } },
    {
      x: function () { return vw(0.3); }, y: function () { return vh(0.13); },
      ease: 'none', immediateRender: false,
      scrollTrigger: {
        trigger: '#oferta', start: 'top bottom', end: 'bottom top',
        scrub: true, invalidateOnRefresh: true
      }
    }));

  // O sol desce no fim de tarde
  astroSegs.push(gsap.fromTo('#astro',
    { x: function () { return vw(0.3); }, y: function () { return vh(0.13); } },
    {
      x: function () { return vw(0.5); }, y: function () { return vh(0.62); }, scale: 1.18,
      ease: 'none', immediateRender: false,
      scrollTrigger: {
        trigger: '#final', start: 'top 85%', end: 'bottom bottom',
        scrub: true, invalidateOnRefresh: true
      }
    }));

  // E mergulha no horizonte quando a noite volta
  astroSegs.push(gsap.fromTo('#astro',
    { y: function () { return vh(0.62); } },
    {
      y: function () { return vh(1.15); },
      ease: 'none', immediateRender: false,
      scrollTrigger: {
        trigger: '#fim', start: 'top 40%', end: 'bottom bottom',
        scrub: true, invalidateOnRefresh: true
      }
    }));

  // O refresh do ScrollTrigger renderiza o "from" de cada segmento na ordem de criação,
  // e o último atropela a posição real do astro. Depois de cada refresh, reaplica o
  // estado do último segmento já alcançado (ou o ponto de partida da lua no topo).
  function placeAstro() {
    var active = null;
    for (var i = 0; i < astroSegs.length; i++) {
      var st = astroSegs[i].scrollTrigger;
      if (st && st.progress > 0) active = astroSegs[i];
    }
    if (active) {
      active.progress(active.scrollTrigger.progress, true);
    } else {
      gsap.set('#astro', { x: luaX(), y: luaY(), scale: 1 });
    }
  }
  ScrollTrigger.addEventListener('refresh', placeAstro);
  placeAstro();
  gsap.fromTo('#sol', { opacity: 1 }, {
    opacity: 0, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: '#fim', start: 'top 30%', end: 'bottom bottom', scrub: true }
  });

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

  gsap.to('.ch-hero .ch-frame', {
    y: -60, opacity: 0.25, ease: 'none',
    scrollTrigger: { trigger: '#topo', start: 'top top', end: 'bottom 30%', scrub: true }
  });
  gsap.to('.scroll-cue', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#topo', start: 'top top', end: '18% top', scrub: true }
  });

  /* ============================================================
     CAPÍTULOS: desktop com pin e scrub, mobile com reveals
     ============================================================ */

  var mm = gsap.matchMedia();

  mm.add('(min-width: 981px)', function () {

    /* --- Capítulo 1: a dor (cena pinada) --- */
    var dor = document.getElementById('dor');
    dor.classList.add('pin-mode');

    var beats = gsap.utils.toArray('.dor-beat');
    var leads = gsap.utils.toArray('.lead');
    gsap.set(beats, { opacity: 0, y: 30 });

    var dorTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#dor', start: 'top top', end: '+=260%',
        pin: true, scrub: 0.6, anticipatePin: 1
      }
    });

    dorTl.to(beats[0], { opacity: 1, y: 0, duration: 0.6 }, 0)
      .to(beats[0], { opacity: 0, y: -26, duration: 0.5 }, 2.2)
      .to(beats[1], { opacity: 1, y: 0, duration: 0.6 }, 2.7)
      .to(beats[1], { opacity: 0, y: -26, duration: 0.5 }, 4.7)
      .to(beats[2], { opacity: 1, y: 0, duration: 0.6 }, 5.2);

    leads.forEach(function (dot, i) {
      var dir = (i % 2 ? 1 : -1) * (24 + i * 14);
      dorTl.fromTo(dot, { y: -12, opacity: 0 }, { y: 155, opacity: 1, duration: 1.1, ease: 'none' }, i * 0.55 + 0.3)
        .to(dot, { y: 215, x: dir, opacity: 0, fill: '#6C7BD9', duration: 0.9, ease: 'power1.in' }, i * 0.55 + 1.4);
    });

    var dorNumEl = document.getElementById('dorNum');
    var dorCount = { v: 0 };
    dorTl.to(dorCount, {
      v: 27, duration: 1.1, ease: 'none',
      onUpdate: function () { dorNumEl.textContent = Math.round(dorCount.v); }
    }, 5.2);

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
      if (dorNumEl) dorNumEl.textContent = '0';
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

    // Os cliques caem em loop enquanto a cena está visível
    var leadLoop = gsap.timeline({
      repeat: -1,
      scrollTrigger: {
        trigger: '.dor-scene', start: 'top 95%', end: 'bottom 5%',
        toggleActions: 'play pause resume pause'
      }
    });
    gsap.utils.toArray('.lead').forEach(function (dot, i) {
      var dir = (i % 2 ? 1 : -1) * (22 + i * 10);
      leadLoop.fromTo(dot, { y: -12, opacity: 0, x: 0 },
        { y: 150, opacity: 1, duration: 1.1, ease: 'none' }, i * 0.45)
        .to(dot, { y: 210, x: dir, opacity: 0, fill: '#6C7BD9', duration: 0.9, ease: 'power1.in' }, i * 0.45 + 1.1);
    });

    var dorNumEl = document.getElementById('dorNum');
    var dorCount = { v: 0 };
    gsap.to(dorCount, {
      v: 27, duration: 1.4, ease: 'power1.out',
      onUpdate: function () { dorNumEl.textContent = Math.round(dorCount.v); },
      scrollTrigger: { trigger: '.dor-counter', start: 'top 92%', once: true }
    });

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

    return function () {
      var el = document.getElementById('dorNum');
      if (el) el.textContent = '0';
    };
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
  gsap.utils.toArray('.quem-foto, .quem-texto, .plans-note, .faq-item').forEach(function (el) {
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

  // Abrir ou fechar qualquer expansor (FAQ, detalhes de plano) muda a altura da página
  gsap.utils.toArray('details').forEach(function (d) {
    d.addEventListener('toggle', function () { ScrollTrigger.refresh(); });
  });
})();
