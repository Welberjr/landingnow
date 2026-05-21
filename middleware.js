/**
 * middleware.js - LandingNow
 * Edge Middleware que troca meta tags Open Graph e Twitter baseado
 * no tema sazonal ativo na data atual. Crawlers de social media
 * (WhatsApp, Facebook, Instagram, LinkedIn, Telegram) recebem HTML
 * com a preview correta do tema vigente.
 *
 * Visitantes normais recebem o mesmo HTML — o motor de temas JS
 * cuida da experiencia visual interativa no navegador.
 *
 * @see https://vercel.com/docs/functions/edge-middleware
 */

export const config = {
  matcher: '/',
};

// ============================================================
// Calendario de temas (espelha themes/calendar.js)
// ============================================================

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

function nthWeekdayOfMonth(year, month, weekday, n) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function findActiveThemeSlug(date) {
  const year = date.getFullYear();
  const easter = easterSunday(year);
  const ashWednesday = addDays(easter, -46);

  const windows = [
    // Datas fixas
    { slug: 'anonovo',       start: new Date(year - 1, 11, 26),       end: new Date(year, 0, 2, 23, 59, 59) },
    { slug: 'anonovo',       start: new Date(year, 11, 26),           end: new Date(year + 1, 0, 2, 23, 59, 59) },
    { slug: 'namorados',     start: new Date(year, 4, 20),            end: new Date(year, 5, 12, 23, 59, 59) },
    { slug: 'junina',        start: new Date(year, 5, 13),            end: new Date(year, 5, 30, 23, 59, 59) },
    { slug: 'independencia', start: new Date(year, 8, 5),             end: new Date(year, 8, 7, 23, 59, 59) },
    { slug: 'criancas',      start: new Date(year, 9, 10),            end: new Date(year, 9, 12, 23, 59, 59) },
    { slug: 'halloween',     start: new Date(year, 9, 25),            end: new Date(year, 9, 31, 23, 59, 59) },
    { slug: 'blackfriday',   start: new Date(year, 10, 1),            end: new Date(year, 10, 30, 23, 59, 59) },
    { slug: 'natal',         start: new Date(year, 11, 10),           end: new Date(year, 11, 25, 23, 59, 59) },

    // Datas moveis
    { slug: 'carnaval', start: addDays(ashWednesday, -12), end: ashWednesday },
    { slug: 'pascoa',   start: addDays(easter, -7),         end: easter },
    { slug: 'maes',     start: addDays(nthWeekdayOfMonth(year, 4, 0, 2), -7), end: nthWeekdayOfMonth(year, 4, 0, 2) },
    { slug: 'pais',     start: addDays(nthWeekdayOfMonth(year, 7, 0, 2), -7), end: nthWeekdayOfMonth(year, 7, 0, 2) },
  ];

  for (const w of windows) {
    if (date >= w.start && date <= w.end) return w.slug;
  }
  return 'default';
}

// ============================================================
// Meta tags por tema
// ============================================================
const BASE_URL = 'https://landingnow.com.br';

const META_BY_THEME = {
  default: {
    title: 'landingnow — Páginas que vendem, a partir de 48h',
    description: 'Landing pages profissionais para pequenos negócios. Entrega a partir de 48h. Sem complicação técnica.',
    image: `${BASE_URL}/og-image.png`,
  },
  namorados: {
    title: 'landingnow — Páginas que apaixonam clientes',
    description: 'Edição especial Dia dos Namorados. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-namorados.png`,
  },
  junina: {
    title: 'landingnow — Páginas que arrasta o povo pro arraiá',
    description: 'Edição especial Festa Junina. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-junina.png`,
  },
  pais: {
    title: 'landingnow — Páginas que o seu pai aprovaria',
    description: 'Edição especial Dia dos Pais. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-pais.png`,
  },
  maes: {
    title: 'landingnow — Páginas que a sua mãe se orgulharia',
    description: 'Edição especial Dia das Mães. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-maes.png`,
  },
  independencia: {
    title: 'landingnow — Páginas que conquistam o Brasil',
    description: 'Edição especial Semana da Pátria. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-independencia.png`,
  },
  criancas: {
    title: 'landingnow — Páginas que encantam até criança',
    description: 'Edição especial Dia das Crianças. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-criancas.png`,
  },
  halloween: {
    title: 'landingnow — Páginas que assombram a concorrência',
    description: 'Edição especial Halloween. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-halloween.png`,
  },
  blackfriday: {
    title: 'landingnow — Páginas que vendem na Black Friday',
    description: 'Edição especial Black Friday. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-blackfriday.png`,
  },
  natal: {
    title: 'landingnow — Páginas que entregam presente de Natal',
    description: 'Edição especial Natal. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-natal.png`,
  },
  anonovo: {
    title: 'landingnow — Páginas que começam o ano vendendo',
    description: 'Edição especial Ano Novo. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-anonovo.png`,
  },
  carnaval: {
    title: 'landingnow — Páginas que caem no samba do cliente',
    description: 'Edição especial Carnaval. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-carnaval.png`,
  },
  pascoa: {
    title: 'landingnow — Páginas que renascem em conversão',
    description: 'Edição especial Páscoa. Sua landing pronta em 48h, com tema sazonal automático que muda em cada data comemorativa.',
    image: `${BASE_URL}/og-image-pascoa.png`,
  },
};

// ============================================================
// Helper: substitui meta tag preservando outros atributos
// ============================================================
function replaceMetaContent(html, attrName, attrValue, newContent) {
  const escaped = newContent.replace(/"/g, '&quot;');
  const regex = new RegExp(
    `(<meta\\s+${attrName}="${attrValue}"[^>]*?content=")[^"]*(")`,
    'i'
  );
  return html.replace(regex, `$1${escaped}$2`);
}

// ============================================================
// Handler principal
// ============================================================
export default async function middleware(request) {
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname !== '/') {
    return; // deixa Vercel servir normalmente
  }

  // Busca o HTML estatico original
  const originalUrl = `${url.origin}/index.html`;
  let originalResponse;
  try {
    originalResponse = await fetch(originalUrl);
  } catch (e) {
    return; // se algo der errado, deixa o fluxo padrao
  }

  if (!originalResponse.ok) return;

  let html = await originalResponse.text();

  // Determina tema ativo
  const slug = findActiveThemeSlug(new Date());
  const meta = META_BY_THEME[slug] || META_BY_THEME.default;

  // Substitui meta tags Open Graph
  html = replaceMetaContent(html, 'property', 'og:title', meta.title);
  html = replaceMetaContent(html, 'property', 'og:description', meta.description);
  html = replaceMetaContent(html, 'property', 'og:image', meta.image);
  html = replaceMetaContent(html, 'property', 'og:image:alt', meta.title);

  // Substitui meta tags Twitter
  html = replaceMetaContent(html, 'name', 'twitter:title', meta.title);
  html = replaceMetaContent(html, 'name', 'twitter:description', meta.description);
  html = replaceMetaContent(html, 'name', 'twitter:image', meta.image);

  // Substitui description geral
  html = replaceMetaContent(html, 'name', 'description', meta.description);

  // Substitui title da aba
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-landingnow-theme': slug,
    },
  });
}
