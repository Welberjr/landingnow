/* ============================================================
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
