// Banco e Z-API falsos, em memoria. Nada aqui toca producao.
process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_ANON_KEY = 'fake-key';
process.env.ANTHROPIC_API_KEY = 'fake-anthropic';
process.env.ZAPI_INSTANCE_ID = 'fake';
process.env.ZAPI_INSTANCE_TOKEN = 'fake';
process.env.ZAPI_CLIENT_TOKEN = 'fake';
process.env.ADMIN_PHONES = '';
process.env.LIA_ATIVA_DESDE = '2020-01-01T00:00:00Z';
process.env.CRON_SECRET = 'segredo-de-teste';
process.env.FOLLOWUP_DESDE = '2020-01-01T00:00:00Z';

const conversas = new Map();   // phone -> linha
const leads = new Map();       // phone -> linha
const enviadas = [];           // {phone, message}
let idSeq = 0;
let respostaIA = 'Resposta automatica da Lia.';

function respJson(obj, status = 200) {
  return { ok: status < 300, status, json: async () => obj, text: async () => JSON.stringify(obj) };
}

// Avalia os filtros do PostgREST que o codigo usa de verdade.
function casa(linha, campo, expr) {
  const [op, ...resto] = expr.split('.');
  const valor = resto.join('.');
  const atual = linha[campo];
  if (op === 'eq') return String(atual) === valor;
  if (op === 'is') return valor === 'null' ? (atual === null || atual === undefined)
    : valor === 'false' ? atual === false : atual === true;
  if (op === 'lt') return atual != null && new Date(atual) < new Date(valor);
  if (op === 'gte') return atual != null && new Date(atual) >= new Date(valor);
  if (op === 'in') return valor.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(atual));
  return true;
}

global.fetch = async (url, opts = {}) => {
  url = String(url);

  if (url.includes('fake.supabase.co')) {
    const rota = url.split('/rest/v1/')[1] || '';
    const tabela = rota.split('?')[0];
    const qs = new URLSearchParams(rota.split('?')[1] || '');
    const metodo = opts.method || 'GET';

    if (tabela === 'lia_processados') {
      if (metodo === 'POST') {
        const id = JSON.parse(opts.body).message_id;
        const existia = conversas.has('proc:' + id);
        conversas.set('proc:' + id, { message_id: id });
        return respJson(existia ? [] : [{ message_id: id }], 201);
      }
      const eq = (qs.get('message_id') || '').replace('eq.', '');
      return respJson(conversas.has('proc:' + eq) ? [{ message_id: eq }] : []);
    }

    if (tabela === 'lia_conversas' || tabela === 'lia_leads') {
      const mapa = tabela === 'lia_leads' ? leads : conversas;
      if (metodo === 'POST') {
        const corpo = JSON.parse(opts.body);
        for (const linha of Array.isArray(corpo) ? corpo : [corpo]) {
          // merge-duplicates: coluna ausente no payload mantem o valor antigo
          mapa.set(linha.phone, Object.assign({}, mapa.get(linha.phone) || {}, linha));
        }
        return respJson([], 201);
      }
      let linhas = [...mapa.values()];
      for (const [campo, expr] of qs.entries()) {
        if (['select', 'order', 'limit', 'offset'].includes(campo)) continue;
        if (campo === 'phone' && expr.startsWith('like.')) {
          const pref = expr.slice(5).replace('*', '');
          linhas = linhas.filter((l) => String(l.phone).startsWith(pref));
          continue;
        }
        linhas = linhas.filter((l) => casa(l, campo, expr));
      }
      const limite = Number(qs.get('limit') || 0);
      return respJson(limite ? linhas.slice(0, limite) : linhas);
    }
    return respJson([]);
  }

  if (url.includes('api.z-api.io')) {
    const corpo = opts.body ? JSON.parse(opts.body) : {};
    enviadas.push({ phone: corpo.phone, message: corpo.message });
    return respJson({ messageId: 'LIA' + (++idSeq) });
  }

  if (url.includes('api.anthropic.com')) {
    return respJson({ content: [{ type: 'text', text: respostaIA }] });
  }

  throw new Error('fetch nao mapeado: ' + url);
};

const { createRequire } = await import('node:module');
const req2 = createRequire(import.meta.url);
// caminho relativo a este arquivo, pra bateria rodar de qualquer maquina
const handler = req2('../api/zapi-webhook.js');
const followup = req2('../api/lia-followup.js');

function resposta() {
  let saida = null;
  const res = {
    setHeader() {},
    status(s) { return { json(o) { saida = { status: s, body: o }; return saida; }, end() { saida = { status: s }; return saida; } }; },
  };
  return { res, pega: () => saida };
}

async function evento(body) {
  const { res, pega } = resposta();
  await handler({ method: 'POST', body: { momment: Date.now(), ...body } }, res);
  return pega();
}

async function rodarFollowup(query = {}) {
  const { res, pega } = resposta();
  await followup({ method: 'GET', headers: { authorization: 'Bearer segredo-de-teste' }, query }, res);
  return pega();
}

const LID_CLIENTE = '82997733114455@lid';
const TEL_CLIENTE = '553198432712';
const LID_WELBER = '62113968054524';
const CONECTADO = '556185970300';

let falhas = 0;
function checar(nome, condicao, detalhe) {
  console.log((condicao ? '  OK   ' : '  FALHOU ') + nome + (condicao ? '' : '  -> ' + detalhe));
  if (!condicao) falhas++;
}
function limpar() { conversas.clear(); leads.clear(); enviadas.length = 0; respostaIA = 'Resposta automatica da Lia.'; }

// ===========================================================================
console.log('\n[1] LID: socio assume na mao e a pausa tem que valer pro cliente');
limpar();
await evento({ messageId: 'M1', phone: TEL_CLIENTE, chatLid: LID_CLIENTE, connectedPhone: CONECTADO,
  fromMe: false, senderName: 'Adriana Souza', text: { message: 'Oi, quero um site' } });
checar('Lia respondeu o cliente novo', enviadas.some((e) => e.phone === TEL_CLIENTE), JSON.stringify(enviadas));

enviadas.length = 0;
const r2 = await evento({ messageId: 'M2', phone: LID_CLIENTE, connectedPhone: CONECTADO,
  fromMe: true, text: { message: 'Oi Adriana, aqui e o Welber, eu assumo daqui' } });
checar('pausou pelo evento fromMe', r2.body.paused === 'fromMe-humano', JSON.stringify(r2));
checar('pausa gravada tambem no telefone', conversas.get('ctrl:' + TEL_CLIENTE)?.nome_cliente === 'paused',
  [...conversas.keys()].filter((k) => k.startsWith('ctrl')).join(' '));

enviadas.length = 0;
const r3 = await evento({ messageId: 'M3', phone: TEL_CLIENTE, chatLid: LID_CLIENTE, connectedPhone: CONECTADO,
  fromMe: false, text: { message: 'Ok, e o valor?' } });
checar('Lia ficou muda depois da pausa', r3.body.paused === true && enviadas.length === 0,
  JSON.stringify({ r3, enviadas }));

// ===========================================================================
console.log('\n[2] Comando do socio chegando como fromMe e com LID');
limpar();
const r4 = await evento({ messageId: 'M4', phone: LID_WELBER, connectedPhone: CONECTADO,
  fromMe: true, text: { message: 'Pausar +55 31 9843-2712' } });
checar('rodou o comando de admin', r4.body.admin === 'fromMe', JSON.stringify(r4));
checar('gravou ctrl do numero pedido', conversas.get('ctrl:' + TEL_CLIENTE)?.nome_cliente === 'paused',
  [...conversas.keys()].join(' '));
checar('NAO pausou o chat do proprio socio', !conversas.has('ctrl:' + LID_WELBER), [...conversas.keys()].join(' '));

// ===========================================================================
console.log('\n[3] Saber calar: o caso da Adriana, tres "Ok" seguidos');
limpar();
respostaIA = 'Claro, sem pressa! Fico por aqui.\n[[CRM: nome=Adriana; negocio=Studio Bella; nicho=estetica; estagio=negociando; plano=PRO; valor=497; objecao=vai pensar]]';
await evento({ messageId: 'A1', phone: TEL_CLIENTE, connectedPhone: CONECTADO, fromMe: false,
  senderName: 'Adriana', text: { message: 'Vou pensar e volto a falar com vc' } });
checar('respondeu a despedida UMA vez', enviadas.length === 1, JSON.stringify(enviadas));
checar('o marcador do CRM nao vazou pro cliente', !/CRM|\[\[/.test(enviadas[0]?.message || ''), enviadas[0]?.message);
checar('gravou a ficha no CRM', leads.get(TEL_CLIENTE)?.negocio === 'Studio Bella' && leads.get(TEL_CLIENTE)?.nicho === 'estetica' && leads.get(TEL_CLIENTE)?.estagio === 'negociando',
  JSON.stringify(leads.get(TEL_CLIENTE)));

enviadas.length = 0;
const ok1 = await evento({ messageId: 'A2', phone: TEL_CLIENTE, connectedPhone: CONECTADO, fromMe: false,
  senderName: 'Adriana', text: { message: 'Ok' } });
checar('nao respondeu o primeiro "Ok"', ok1.body.silencio === 'cortesia' && enviadas.length === 0,
  JSON.stringify({ ok1, enviadas }));

const ok2 = await evento({ messageId: 'A3', phone: TEL_CLIENTE, connectedPhone: CONECTADO, fromMe: false,
  senderName: 'Adriana', text: { message: 'Ok volta teremos a conversar' } });
checar('nao respondeu o segundo tambem', ok2.body.silencio === 'cortesia' && enviadas.length === 0,
  JSON.stringify({ ok2, enviadas }));

// ===========================================================================
console.log('\n[4] Saber calar nao pode virar mudez: pergunta de verdade volta a ser respondida');
enviadas.length = 0;
respostaIA = 'Fecha sim! Te mando o link agora.';
const volta = await evento({ messageId: 'A4', phone: TEL_CLIENTE, connectedPhone: CONECTADO, fromMe: false,
  senderName: 'Adriana', text: { message: 'Pensei melhor, consegue fechar hoje?' } });
checar('voltou a responder', volta.body.ok === true && enviadas.length === 1, JSON.stringify({ volta, enviadas }));

// ===========================================================================
console.log('\n[5] Cliente antigo pedindo suporte nao pode receber venda');
limpar();
enviadas.length = 0;
const sup = await evento({ messageId: 'S1', phone: '5511942701290', connectedPhone: CONECTADO, fromMe: false,
  senderName: 'Jorge', text: { message: 'O site que voces fizeram pra mim nao esta abrindo' } });
checar('pausou e nao vendeu', sup.body.paused === 'pos-venda', JSON.stringify(sup));
checar('nao citou preco pro cliente', !/297|497|997|R\$/.test(enviadas[0]?.message || ''), enviadas[0]?.message);
checar('avisou os socios', enviadas.some((e) => /Pos-venda/i.test(e.message || '')), JSON.stringify(enviadas));
// o lead e gravado na forma canonica (sem o nono digito), a conversa no cru
checar('marcou como suporte no CRM', leads.get('551142701290')?.estagio === 'suporte',
  JSON.stringify([...leads.keys()]));
checar('guardou a chave da conversa', leads.get('551142701290')?.chave_conversa === '5511942701290',
  JSON.stringify(leads.get('551142701290')));

enviadas.length = 0;
const sup2 = await evento({ messageId: 'S2', phone: '5511942701290', connectedPhone: CONECTADO, fromMe: false,
  text: { message: 'Quanto custa uma landing nova?' } });
checar('segue calada com o cliente ja assumido', sup2.body.paused === true && enviadas.length === 0,
  JSON.stringify({ sup2, enviadas }));

// ===========================================================================
console.log('\n[6] Follow-up de 2 dias: manda uma vez e nunca mais');
limpar();
const TRES_DIAS = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
leads.set('551163411212', { phone: '551163411212', chave_conversa: '5511963411212', nome: 'Luiz',
  nicho: 'advocacia', estagio: 'negociando', plano_ofertado: 'PRO', valor_ofertado: 497,
  objecao: 'achou caro', eh_cliente: false, ultima_mensagem_em: TRES_DIAS, followup_enviado_em: null });
leads.set('552788217369', { phone: '552788217369', chave_conversa: '5527988217369', nome: 'Erick',
  estagio: 'ganho', eh_cliente: true, ultima_mensagem_em: TRES_DIAS, followup_enviado_em: null });
leads.set('552195770749', { phone: '552195770749', chave_conversa: '5521995770749', nome: 'Patricia',
  estagio: 'proposta', eh_cliente: false, ultima_mensagem_em: new Date().toISOString(), followup_enviado_em: null });
conversas.set('5511963411212', { phone: '5511963411212', mensagens: [
  { role: 'user', content: 'quanto fica?' }, { role: 'assistant', content: 'R$ 497 no PRO' }], nome_cliente: 'Luiz' });

respostaIA = 'Luiz, fiquei pensando no seu caso: consigo te colocar no ar por R$ 297 no START. Quer ver?\n[[CRM: estagio=negociando; plano=START; valor=297]]';
const f1 = await rodarFollowup({ forcar: '1' });
checar('retomou so o lead frio', f1.body.enviados === 1, JSON.stringify(f1.body));
checar('mandou pro Luiz', enviadas.some((e) => e.phone === '5511963411212'), JSON.stringify(enviadas));
checar('nao mexeu no cliente ja fechado', !enviadas.some((e) => e.phone === '5527988217369'), JSON.stringify(enviadas));
checar('nao mexeu em quem falou hoje', !enviadas.some((e) => e.phone === '5521995770749'), JSON.stringify(enviadas));
checar('marcou o envio no CRM', !!leads.get('551163411212')?.followup_enviado_em, JSON.stringify(leads.get('551163411212')));
checar('nao perdeu a chave da conversa', leads.get('551163411212')?.chave_conversa === '5511963411212',
  JSON.stringify(leads.get('551163411212')));
checar('marcador do CRM nao vazou', !/\[\[/.test(enviadas.find((e) => e.phone === '5511963411212')?.message || ''), '');
checar('avisou os socios da retomada', enviadas.some((e) => /Retomei 1/.test(e.message || '')), JSON.stringify(enviadas));

enviadas.length = 0;
const f2 = await rodarFollowup({ forcar: '1' });
checar('segunda rodada nao insiste', f2.body.enviados === 0 && enviadas.length === 0, JSON.stringify({ f2: f2.body, enviadas }));

// ===========================================================================
console.log('\n[7] Follow-up nao fala com quem esta pausado');
limpar();
leads.set('551163411212', { phone: '551163411212', chave_conversa: '5511963411212', nome: 'Luiz',
  estagio: 'negociando', eh_cliente: false, ultima_mensagem_em: TRES_DIAS, followup_enviado_em: null });
conversas.set('ctrl:551163411212', { phone: 'ctrl:551163411212', nome_cliente: 'paused' });
const f3 = await rodarFollowup({ forcar: '1' });
checar('respeitou a pausa', f3.body.enviados === 0 && /pausado/.test(JSON.stringify(f3.body.pulados)),
  JSON.stringify(f3.body));

// ===========================================================================
console.log('\n[8] Follow-up trancado pra quem nao tem o segredo');
const { res: resNu, pega: pegaNu } = resposta();
await followup({ method: 'GET', headers: {}, query: {} }, resNu);
checar('sem segredo, 401', pegaNu().status === 401, JSON.stringify(pegaNu()));

// ===========================================================================
// O caso do Sergio, visto no CRM em 17/08: ficha em "novo" com o PRO ja
// ofertado. Quem recebeu preco nao esta mais no comeco da fila, e lead parado
// em "novo" tambem engana o kanban e a leitura do funil.
console.log('\n[9] Plano ofertado nao pode conviver com estagio "novo"');
limpar();
respostaIA = 'O PRO sai por R$ 497 e fica pronto em 5 dias.\n[[CRM: nome=Sergio; plano=PRO; valor=497]]';
await evento({ messageId: 'P1', phone: TEL_CLIENTE, connectedPhone: CONECTADO, fromMe: false,
  senderName: 'Sergio', text: { message: 'Quanto custa?' } });
checar('ofertou o plano e a ficha saiu de "novo"', leads.get(TEL_CLIENTE)?.estagio === 'proposta',
  JSON.stringify(leads.get(TEL_CLIENTE)));

// A ficha ja gravada errada tambem tem que se acertar sozinha na proxima
// mensagem, sem ninguem editar o banco na mao.
limpar();
leads.set('551163411212', { phone: '551163411212', chave_conversa: '5511963411212', nome: 'Sergio',
  estagio: 'novo', plano_ofertado: 'PRO', eh_cliente: false });
respostaIA = 'Fechado, te mando o link.';
await evento({ messageId: 'P2', phone: '5511963411212', connectedPhone: CONECTADO, fromMe: false,
  senderName: 'Sergio', text: { message: 'Vou ver com meu socio e te falo' } });
checar('ficha velha se corrigiu na proxima mensagem', leads.get('551163411212')?.estagio === 'proposta',
  JSON.stringify(leads.get('551163411212')));

// E o conserto nao pode empurrar pra tras quem ja andou no funil.
limpar();
leads.set('551163411212', { phone: '551163411212', chave_conversa: '5511963411212', nome: 'Sergio',
  estagio: 'negociando', plano_ofertado: 'PRO', eh_cliente: false });
respostaIA = 'Perfeito, aviso os socios.';
await evento({ messageId: 'P3', phone: '5511963411212', connectedPhone: CONECTADO, fromMe: false,
  senderName: 'Sergio', text: { message: 'Achei caro ainda' } });
checar('nao rebaixou quem ja estava negociando', leads.get('551163411212')?.estagio === 'negociando',
  JSON.stringify(leads.get('551163411212')));

console.log(falhas === 0 ? '\nTUDO PASSOU' : '\n' + falhas + ' TESTE(S) FALHARAM');
process.exit(falhas === 0 ? 0 : 1);
