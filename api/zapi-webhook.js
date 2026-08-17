// ============================================================================
// LIA via WhatsApp - Z-API Webhook  |  v17
// Tudo da v12 (memoria Supabase + audio Groq + anti-duplicacao + demora
// humana + primeiro nome + visao de imagem) MAIS:
//  - Modelo Claude Sonnet 4.6 (antes Haiku 4.5)
//  - Deteccao de intencao: modo consultivo vs modo fechamento (sem enrolar)
//  - Pausa automatica: Welber respondeu manualmente -> LIA cala naquele chat
//    e SO volta com comando manual (sem retomada automatica)
//  - Canal admin: comandos pelo WhatsApp pessoal do Welber
//    (voltar NUMERO / pausar NUMERO / status)
//  - Notificacoes ao Welber: comprovante recebido, duvida fora do escopo,
//    pedido de falar com humano (marcador [[AVISAR_WELBER: ...]])
//  - Mensagens manuais do Welber entram no historico (LIA volta com contexto)
//  - Demora humana recalibrada: 20 a 60s conforme tamanho da resposta
// v18 (18/06/2026): nova tabela (Start 297, Pro 497, Premium 997, Premium IA 1497).
//   Ancora comercial no plano PRO (R$ 497), que e o valor anunciado. A LIA nao
//   oferece o START por conta propria. So apresenta o START se o cliente pedir
//   uma opcao mais barata, ou se nao tiver como fechar o PRO nem parcelado em 12x.
//   Sem upsell automatico pro PREMIUM nem PREMIUM IA.
// Atualizado em 13/06/2026
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
// Chave de acesso ao banco. Prefere a chave de SERVICO, que so existe aqui no
// servidor; a anon fica de reserva pra nada cair enquanto a env nova nao sobe.
// A anon estava publicada em painel/index.html, que e versionado em repo
// publico, entao ela perde o acesso as tabelas da LIA assim que a service key
// estiver na Vercel (SQL em sql/02-fechar-banco.sql).
// Chave de acesso ao banco, na ordem de preferencia. A de servico so existe
// aqui no servidor; a anon fica por ultimo porque ela esta publicada em
// painel/index.html, que e versionado em repo publico.
// Sao varios nomes de proposito: em cada projeto essa env foi batizada de um
// jeito, e nao vale a LIA ficar na chave exposta por causa de uma palavra.
const CHAVES_POSSIVEIS = [
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'Service_Role',
  'SUPABASE_ANON_KEY',
];
const NOME_DA_CHAVE = CHAVES_POSSIVEIS.find(function (n) { return process.env[n]; }) || null;
const SUPABASE_ANON = NOME_DA_CHAVE ? process.env[NOME_DA_CHAVE] : undefined;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MAX_HISTORICO_SALVO = 40;
const MAX_HISTORICO_CONTEXTO = 20;
const MAX_IMAGEM_BYTES = 4500000; // ~4.5MB (limite seguro pra API)

// ---------------------------------------------------------------------------
// TRAVAS DE SEGURANCA (incidente de 10/08/2026)
// Quando a instancia do Z-API fica desligada e volta, o WhatsApp entrega DE UMA
// VEZ toda a fila atrasada. Sem trava, a LIA responde conversa de semanas atras
// como se fosse nova, e foi exatamente o que aconteceu.
//   LIA_ATIVA_DESDE : data ISO na env. Nada anterior a ela recebe resposta.
//   FRESCOR_MAX_MS  : mesmo depois do corte, mensagem parada ha mais de 15 min
//                     e considerada atrasada (fila represada) e fica sem
//                     resposta automatica. So vale pra respostas do robo: o
//                     humano continua vendo tudo no WhatsApp normalmente.
// ---------------------------------------------------------------------------
const CUTOFF_MS = Date.parse(process.env.LIA_ATIVA_DESDE || '') || 0;
const FRESCOR_MAX_MS = 15 * 60 * 1000;

// Freio de arranque: se a LIA disparar demais numa mesma conversa, ela para,
// pausa a conversa e chama os socios em vez de continuar metralhando.
const LIMITES_RAJADA = [
  { ms: 5 * 60 * 1000, max: 8 },
  { ms: 60 * 60 * 1000, max: 20 },
];

// Timestamp da mensagem no payload do Z-API (campo momment, epoch).
// Aceita segundos ou milissegundos. Retorna null quando nao da pra saber.
function momentoDaMensagem(body) {
  const bruto = body?.momment ?? body?.moment ?? body?.messageTimestamp ?? body?.timestamp;
  let n = Number(bruto);
  if (!isFinite(n) || n <= 0) return null;
  if (n < 1e11) n = n * 1000; // veio em segundos
  return n;
}

function semAcento(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// O cliente pediu pra parar? Precisa ser explicito: "para" solto no meio de uma
// frase ("landing page para minha loja") NAO conta.
function pedeParaParar(texto) {
  const t = semAcento(texto).replace(/\s+/g, ' ');
  if (!t) return false;
  if (/(par[ae]r?|pare) (de|com) (mandar|enviar|responder|falar|me mandar|me enviar)/.test(t)) return true;
  if (/(me deixa em paz|nao me mande? mais|nao quero mais (falar|receber|nada)|descadastr|sai do meu|me tira d)/.test(t)) return true;
  if (t.length <= 32 && /^(pare|para|parar|chega|stop|silencio|quieto)[\s!.,]*(ai|com isso|por favor|pfv|pf)?[\s!.,]*$/.test(t)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// SABER CALAR
// A conversa acabou e o cliente so esta sendo educado ("ok", "obrigada",
// "depois eu falo com voces"). A LIA agradece UMA vez e depois fica quieta.
// Isso nao pode ser so instrucao de prompt: a API sempre devolve texto, entao
// se depender da boa vontade dela, ela fala. Tem que ser trava de codigo.
// ---------------------------------------------------------------------------
const PALAVRAS_DE_CORTESIA = new Set(('ok okay okei oki blz beleza ta tah bom certo combinado perfeito otimo show top ' +
  'legal massa valeu vlw obrigado obrigada brigado brigada obg agradecido agradecida nada isso sim uhum aham ' +
  'entendi entendido ja vi tmj abraco abracos abs att dia tarde noite ate logo mais depois falo falamos conversamos ' +
  'volta voltamos conversar retorno aviso chamo qualquer coisa eu te lhe com voces voce vou pensar ver decidir ' +
  'amanha semana breve tambem so a o e de da do que me na no um uma pra para por favor pf pfv').split(' '));

function ehSoCortesia(texto) {
  const t = semAcento(texto)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return true;                       // so emoji ou so pontuacao
  if (t.length > 70) return false;
  return t.split(' ').every(function (p) { return PALAVRAS_DE_CORTESIA.has(p); });
}

// "Vou pensar e te falo", "depois eu falo com voces", "qualquer coisa eu chamo".
// Marca a despedida do lead: e exatamente esse cliente que o follow-up de dois
// dias vem buscar depois.
function ehDespedidaDeLead(texto) {
  const t = semAcento(texto);
  if (/(vou|vamos) (pensar|ver|analisar|conversar|decidir|avaliar)/.test(t)) return true;
  if (/(depois|mais tarde|amanha|semana que vem)[^.]{0,20}(falo|te falo|te chamo|retorno|volto|aviso)/.test(t)) return true;
  if (/(qualquer coisa|se precisar|quando (eu )?decidir)[^.]{0,20}(chamo|falo|aviso)/.test(t)) return true;
  if (/(volto a falar|te falo depois|te aviso|te retorno|entro em contato)/.test(t)) return true;
  return ehSoCortesia(texto);
}

// Mensagem que merece resposta mesmo depois da despedida: tem pergunta, pedido
// ou assunto de verdade.
function pareceMensagemDeVerdade(texto) {
  const bruto = String(texto || '');
  if (/\?/.test(bruto)) return true;
  if (bruto.length > 90) return true;        // texto longo nunca e so cortesia
  const t = semAcento(bruto);
  return /\b(quero|queria|gostaria|pode|poderia|manda|mande|envia|envie|como|quanto|qual|quais|quando|onde|porque|por que|preciso|fecha|fechar|fechamos|vamos|bora|aceito|topo|link|pix|pagar|paguei|comprovante|briefing|duvida|ajuda|ajudar|problema|erro|orcamento|prazo|plano|site|landing|pagina)\b/.test(t);
}

// A ultima troca ja foi uma despedida? Deriva do proprio historico, sem
// precisar de estado novo no banco: se a mensagem anterior do cliente ja era
// cortesia e a LIA respondeu, o assunto morreu ali.
function jaSeDespediram(historico) {
  const msgs = (historico || []).filter(function (m) { return m && m.content; });
  if (!msgs.length) return false;
  // Olha a ULTIMA mensagem do cliente antes desta. Nao exige resposta da LIA no
  // meio: depois que ela cala, o historico termina em mensagem do cliente, e a
  // conversa continua encerrada do mesmo jeito.
  const anteriorDoCliente = [...msgs].reverse().find(function (m) { return m.role === 'user'; });
  if (!anteriorDoCliente) return false;
  return ehDespedidaDeLead(anteriorDoCliente.content);
}

// ---------------------------------------------------------------------------
// POS-VENDA: quem ja e cliente nao pode receber venda.
// Foi o que aconteceu com o cliente que so queria um ajuste e levou enxurrada
// de oferta. Aqui a LIA cala, chama o Welber e o Caio, e sai da frente.
// ---------------------------------------------------------------------------
function cheiroDePosVenda(texto) {
  const t = semAcento(texto);
  if (/(voces (fizeram|criaram|montaram|entregaram|desenvolveram)|(site|landing|pagina) que voces|ja sou cliente|ja fechei com voces|ja contratei|comprei com voces|fiz o pagamento com voces)/.test(t)) return true;
  if (/(nao esta (abrindo|funcionando|no ar|carregando)|nao abre|saiu do ar|fora do ar|caiu o site|deu erro|esta bugad)/.test(t)) return true;
  if (/\b(suporte|manutencao)\b/.test(t)) return true;
  return false;
}

// Quantas respostas a LIA mandou nessa conversa dentro de cada janela
function estourouRajada(historico) {
  const agora = Date.now();
  for (const lim of LIMITES_RAJADA) {
    const n = (historico || []).filter(
      (m) => m && m.role === 'assistant' && m.t && agora - m.t < lim.ms
    ).length;
    if (n >= lim.max) return lim;
  }
  return null;
}

// WhatsApp pessoal dos socios (canal de comando e notificacoes).
// O numero do Welber fica aqui; numeros adicionais (ex.: o do Caio) entram
// pela env ADMIN_PHONES separados por virgula, pra nao expor telefone novo
// neste repositorio publico.
const ADMIN_PHONE = '5561982920444';

// Normaliza numeros BR: adiciona DDI 55 se faltar e REMOVE o nono digito,
// porque o WhatsApp entrega o JID de contas antigas sem ele.
// Ex: 5561982920444 -> 556182920444 | 61982920444 -> 556182920444
function canonicalBR(phone) {
  let n = String(phone || '').replace(/\D/g, '');
  if (n.length === 10 || n.length === 11) n = '55' + n;
  if (/^55\d{2}9\d{8}$/.test(n)) n = n.slice(0, 4) + n.slice(5);
  return n;
}
const ADMIN_CANONS = Array.from(new Set(
  (ADMIN_PHONE + ',' + (process.env.ADMIN_PHONES || ''))
    .split(',').map(function (s) { return canonicalBR(s.trim()); }).filter(Boolean)
));
const ADMIN_CANON = ADMIN_CANONS[0];
function ehAdmin(phone) {
  return !!phone && ehAdminId(canonicalBR(phone));
}

// ---------------------------------------------------------------------------
// LID x telefone (incidente de 16/08/2026)
// O WhatsApp migrou os contatos pro LID e o Z-API passou a mandar, em parte dos
// eventos, um identificador de 14+ digitos no lugar do telefone. Como a pausa
// era gravada e consultada por UM campo so, ela ia parar numa chave que ninguem
// consultava: gravava ctrl:62113968054524 e conferia ctrl:553198432712. Era por
// isso que a LIA continuava respondendo depois de pausada. Pior: o proprio dono
// deixou de ser reconhecido quando a mensagem dele chegou com LID, e o comando
// "pausar NUMERO" virou conversa de cliente.
// Agora a conversa e identificada pelo CONJUNTO de identificadores do evento e
// a pausa vale se qualquer um deles bater.
// ---------------------------------------------------------------------------
function soDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

// Telefone de verdade tem no maximo 13 digitos (55 + DDD + 9 digitos). Acima
// disso, ou marcado com @lid, e identificador interno do WhatsApp.
function ehLid(v) {
  return /@lid/i.test(String(v || '')) || soDigitos(v).length >= 14;
}

// LIDs dos socios. Sem isso a LIA nao reconhece o proprio dono quando o evento
// chega com LID. Formato da env ADMIN_LIDS: LID:TELEFONE ou so o LID, varios
// separados por virgula.
const ADMIN_LID_MAP = Object.create(null);
ADMIN_LID_MAP['62113968054524'] = canonicalBR(ADMIN_PHONE); // Welber, do chatLid do payload de 10/06
for (const par of String(process.env.ADMIN_LIDS || '').split(',')) {
  const lid = soDigitos(par.split(':')[0]);
  const tel = soDigitos(par.split(':')[1] || '');
  if (lid) ADMIN_LID_MAP[lid] = tel ? canonicalBR(tel) : ADMIN_CANON;
}

function ehAdminId(id) {
  if (!id) return false;
  return ADMIN_CANONS.indexOf(id) !== -1 || !!ADMIN_LID_MAP[id];
}

// Numero pra onde responder um comando de socio (nunca mandar pra um LID).
function telefoneAdmin(ids) {
  for (const id of ids || []) {
    if (ADMIN_CANONS.indexOf(id) !== -1) return id;
    if (ADMIN_LID_MAP[id]) return ADMIN_LID_MAP[id];
  }
  return ADMIN_CANON;
}

// Todos os jeitos que o Z-API pode identificar a conversa neste evento.
function idsDaConversa(body) {
  const brutos = [
    body && body.phone,
    body && body.chatLid,
    body && body.participantLid,
    body && body.senderLid,
    body && body.participantPhone,
    body && body.senderPhone,
  ];
  const conectado = canonicalBR((body && body.connectedPhone) || '');
  const out = [];
  for (const bruto of brutos) {
    const id = canonicalBR(bruto);
    if (!id || id.length < 10) continue;
    if (conectado && id === conectado) continue; // numero da propria empresa
    if (out.indexOf(id) === -1) out.push(id);
  }
  return out;
}

// Chave de armazenamento e de envio: telefone de verdade sempre que houver.
// Quando body.phone ja e um telefone, nada muda em relacao ao comportamento
// antigo (nao mexer nisso preserva o historico das conversas ja gravadas).
function chaveDaConversa(body, ids) {
  const bruto = String((body && body.phone) || '');
  if (bruto && !ehLid(bruto)) return bruto;
  const real = (ids || []).find(function (id) { return !ehLid(id) && !ehAdminId(id); });
  return real || soDigitos(bruto) || '';
}

const MODELO = 'claude-sonnet-4-6';

function primeiroNomeDe(nome) {
  if (!nome) return null;
  const limpo = String(nome).trim().split(/\s+/)[0];
  return limpo || null;
}

// ---------------------------------------------------------------------------
// lia_processados: anti-duplicacao + registro das mensagens enviadas pela LIA
// ---------------------------------------------------------------------------
async function inserirProcessada(messageId) {
  if (!SUPABASE_URL || !SUPABASE_ANON || !messageId) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/lia_processados?on_conflict=message_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify({ message_id: String(messageId) }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    // retorna true se JA EXISTIA (duplicada)
    return Array.isArray(data) && data.length === 0;
  } catch (e) {
    console.error('[processados] erro:', e);
    return false;
  }
}

async function ehDuplicada(messageId) {
  return inserirProcessada(messageId);
}

async function jaRegistrada(messageId) {
  if (!SUPABASE_URL || !SUPABASE_ANON || !messageId) return false;
  try {
    const url = `${SUPABASE_URL}/rest/v1/lia_processados?message_id=eq.${encodeURIComponent(String(messageId))}&select=message_id`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!r.ok) return false;
    const data = await r.json();
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    console.error('[processados] erro ao consultar:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Transcricao de audio via Groq (Whisper)
// ---------------------------------------------------------------------------
async function transcreverAudio(audioUrl, mimeType) {
  if (!GROQ_API_KEY) { console.error('[groq] GROQ_API_KEY ausente'); return null; }
  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) { console.error('[groq] download do audio falhou:', audioRes.status); return null; }
    const arrayBuffer = await audioRes.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: mimeType || 'audio/ogg' });

    const form = new FormData();
    form.append('file', blob, 'audio.ogg');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'pt');
    form.append('response_format', 'json');

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
    });
    if (!r.ok) { console.error('[groq] transcricao falhou:', r.status, await r.text()); return null; }
    const data = await r.json();
    return (data.text || '').trim() || null;
  } catch (e) {
    console.error('[groq] erro na transcricao:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Download de imagem -> base64 (pra visao do modelo)
// ---------------------------------------------------------------------------
async function baixarImagemBase64(imageUrl) {
  try {
    const r = await fetch(imageUrl);
    if (!r.ok) { console.error('[imagem] download falhou:', r.status); return null; }
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_IMAGEM_BYTES) { console.error('[imagem] muito grande:', buf.byteLength); return null; }
    return Buffer.from(buf).toString('base64');
  } catch (e) {
    console.error('[imagem] erro no download:', e);
    return null;
  }
}

function normalizarMime(mime) {
  const limpo = (mime || 'image/jpeg').split(';')[0].trim().toLowerCase();
  const aceitos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return aceitos.includes(limpo) ? limpo : 'image/jpeg';
}

// ---------------------------------------------------------------------------
// Persistencia no Supabase (memoria da conversa)
// ---------------------------------------------------------------------------
async function lerConversa(phone) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return { mensagens: [], nome: null };
  try {
    const url = `${SUPABASE_URL}/rest/v1/lia_conversas?phone=eq.${encodeURIComponent(phone)}&select=mensagens,nome_cliente`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!r.ok) { console.error('[supabase] ler falhou:', r.status); return { mensagens: [], nome: null }; }
    const data = await r.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        mensagens: Array.isArray(data[0].mensagens) ? data[0].mensagens : [],
        nome: data[0].nome_cliente || null,
      };
    }
    return { mensagens: [], nome: null };
  } catch (e) {
    console.error('[supabase] erro ao ler:', e);
    return { mensagens: [], nome: null };
  }
}

async function salvarConversa(phone, mensagens, nome) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    const recortadas = mensagens.slice(-MAX_HISTORICO_SALVO);
    const body = JSON.stringify({
      phone,
      mensagens: recortadas,
      nome_cliente: nome || null,
      total_mensagens: mensagens.length,
      updated_at: new Date().toISOString(),
    });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/lia_conversas`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body,
    });
    if (!r.ok) console.error('[supabase] salvar falhou:', r.status, await r.text());
  } catch (e) {
    console.error('[supabase] erro ao salvar:', e);
  }
}

// ---------------------------------------------------------------------------
// Pausa por conversa (registro de controle ctrl:PHONE na lia_conversas)
// nome_cliente = 'paused' ou 'active'
// ---------------------------------------------------------------------------
// A pausa vale se QUALQUER identificador da conversa estiver marcado. E o que
// faz a pausa gravada com o telefone continuar valendo quando o proximo evento
// chegar so com o LID, e vice-versa.
async function estaPausadaQualquer(ids) {
  const lista = Array.from(new Set((ids || []).map(canonicalBR).filter(Boolean)));
  if (!lista.length || !SUPABASE_URL || !SUPABASE_ANON) return false;
  try {
    const chaves = lista.map(function (id) { return '"ctrl:' + id + '"'; }).join(',');
    const url = `${SUPABASE_URL}/rest/v1/lia_conversas?phone=in.(${encodeURIComponent(chaves)})&nome_cliente=eq.paused&select=phone`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!r.ok) { console.error('[pausa] consulta falhou:', r.status); return false; }
    const data = await r.json();
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    console.error('[pausa] erro ao consultar:', e);
    return false;
  }
}

async function estaPausada(phone) {
  return estaPausadaQualquer([phone]);
}

// Grava a pausa em TODOS os identificadores conhecidos da conversa.
async function definirPausaVarios(ids, pausada) {
  const lista = Array.from(new Set((ids || []).map(canonicalBR).filter(Boolean)));
  if (!lista.length || !SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    const agora = new Date().toISOString();
    const body = JSON.stringify(lista.map(function (id) {
      return {
        phone: 'ctrl:' + id,
        mensagens: [],
        nome_cliente: pausada ? 'paused' : 'active',
        total_mensagens: 0,
        updated_at: agora,
      };
    }));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/lia_conversas`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body,
    });
    if (!r.ok) console.error('[pausa] salvar falhou:', r.status, await r.text());
  } catch (e) {
    console.error('[pausa] erro ao salvar:', e);
  }
}

async function definirPausa(phone, pausada) {
  return definirPausaVarios([phone], pausada);
}

// ---------------------------------------------------------------------------
// Mapa LID <-> telefone. Sempre que os dois aparecem no mesmo evento, o par
// fica guardado (lidmap:LID -> telefone e telmap:TELEFONE -> LID). E o que
// permite o socio pausar digitando o telefone e a pausa valer quando a proxima
// mensagem do cliente chegar identificada so pelo LID.
// ---------------------------------------------------------------------------
async function aprenderLids(ids) {
  const lids = (ids || []).filter(ehLid);
  const telefone = (ids || []).find(function (id) { return !ehLid(id); });
  if (!lids.length || !telefone || !SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    const agora = new Date().toISOString();
    const linhas = [];
    for (const lid of lids) {
      linhas.push({ phone: 'lidmap:' + lid, mensagens: [], nome_cliente: telefone, total_mensagens: 0, updated_at: agora });
      linhas.push({ phone: 'telmap:' + telefone, mensagens: [], nome_cliente: lid, total_mensagens: 0, updated_at: agora });
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/lia_conversas`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(linhas),
    });
    if (!r.ok) console.error('[lidmap] salvar falhou:', r.status);
  } catch (e) {
    console.error('[lidmap] erro ao salvar:', e);
  }
}

async function expandirIds(ids) {
  const base = Array.from(new Set((ids || []).map(canonicalBR).filter(Boolean)));
  if (!base.length || !SUPABASE_URL || !SUPABASE_ANON) return base;
  try {
    const chaves = base.map(function (id) {
      return '"' + (ehLid(id) ? 'lidmap:' : 'telmap:') + id + '"';
    }).join(',');
    const url = `${SUPABASE_URL}/rest/v1/lia_conversas?phone=in.(${encodeURIComponent(chaves)})&select=phone,nome_cliente`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!r.ok) return base;
    const data = await r.json();
    for (const linha of Array.isArray(data) ? data : []) {
      const achado = canonicalBR(linha && linha.nome_cliente);
      if (achado && base.indexOf(achado) === -1) base.push(achado);
    }
    return base;
  } catch (e) {
    console.error('[lidmap] erro ao ler:', e);
    return base;
  }
}

// Registro cru dos eventos fromMe que nao deu pra identificar. Guarda so os
// campos de identificacao (nunca o texto da mensagem) e mantem os 10 ultimos.
// E o que vai mostrar, quando o Z-API religar, em que campo o telefone do
// cliente realmente vem nesses eventos.
async function registrarFromMe(body, ids) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    const { mensagens } = await lerConversa('debug:fromme');
    const linha = {
      role: 'user',
      content: new Date().toISOString() +
        ' | ids=' + JSON.stringify(ids || []) +
        ' | phone=' + String((body && body.phone) || '') +
        ' | chatLid=' + String((body && body.chatLid) || '') +
        ' | participantLid=' + String((body && body.participantLid) || '') +
        ' | senderLid=' + String((body && body.senderLid) || '') +
        ' | connectedPhone=' + String((body && body.connectedPhone) || '') +
        ' | campos=' + Object.keys(body || {}).join(','),
    };
    await salvarConversa('debug:fromme', [...(mensagens || []), linha].slice(-10), 'debug');
  } catch (e) {
    console.error('[debug fromMe] erro:', e);
  }
}

// ---------------------------------------------------------------------------
// CRM (tabela lia_leads)
// A LIA preenche sozinha, de carona na resposta que ela ja ia dar: ela devolve
// um bloco [[CRM: ...]] no fim do texto, o codigo arranca esse bloco antes de
// enviar e grava. Custo zero de IA, e o cliente nunca ve.
// ---------------------------------------------------------------------------
const ESTAGIOS = ['novo', 'qualificando', 'proposta', 'negociando', 'ganho', 'perdido', 'cliente', 'suporte'];
const PLANOS = ['START', 'PRO', 'PREMIUM', 'PREMIUM IA', 'AMOSTRA'];

function extrairCrm(texto) {
  let crm = null;
  const limpo = String(texto || '').replace(/\[\[\s*CRM\s*:?\s*([\s\S]*?)\]\]/gi, function (m, g1) {
    const dados = {};
    for (const parte of String(g1 || '').split(';')) {
      const i = parte.indexOf('=');
      if (i === -1) continue;
      const chave = semAcento(parte.slice(0, i)).replace(/\W/g, '');
      const valor = parte.slice(i + 1).trim();
      if (!chave || !valor || /^(nao sei|nulo|null|vazio|-)$/i.test(valor)) continue;
      dados[chave] = valor.slice(0, 240);
    }
    if (Object.keys(dados).length) crm = dados;
    return '';
  }).trim();
  return { limpo, crm };
}

// Traduz o bloco cru da LIA pras colunas da tabela, jogando fora o que nao
// reconhece. Campo que ela nao mandou fica de fora do update, pra nao apagar
// o que ja estava certo.
function normalizarCrm(crm) {
  if (!crm) return null;
  const out = {};
  if (crm.nicho) out.nicho = crm.nicho;
  if (crm.nome) out.nome = crm.nome;
  if (crm.objecao) out.objecao = crm.objecao;
  if (crm.motivo) out.motivo = crm.motivo;
  if (crm.proximo) out.proximo_passo = crm.proximo;
  if (crm.proximopasso) out.proximo_passo = crm.proximopasso;
  if (crm.origem) out.origem = crm.origem;
  if (crm.estagio) {
    const e = semAcento(crm.estagio).replace(/\W/g, '');
    if (ESTAGIOS.indexOf(e) !== -1) out.estagio = e;
  }
  if (crm.plano) {
    const p = String(crm.plano).toUpperCase().replace(/[^A-Z ]/g, '').trim();
    if (PLANOS.indexOf(p) !== -1) out.plano_ofertado = p;
  }
  if (crm.valor) {
    const n = Number(String(crm.valor).replace(/[^\d]/g, ''));
    if (isFinite(n) && n > 0) out.valor_ofertado = n;
  }
  if (out.estagio === 'ganho' || out.estagio === 'cliente') out.eh_cliente = true;
  return Object.keys(out).length ? out : null;
}

async function lerLead(phone) {
  if (!SUPABASE_URL || !SUPABASE_ANON || !phone) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/lia_leads?phone=eq.${encodeURIComponent(canonicalBR(phone))}&select=*`;
    const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
    if (!r.ok) return null;                  // tabela ainda nao criada: segue a vida
    const data = await r.json();
    return Array.isArray(data) && data.length ? data[0] : null;
  } catch (e) {
    console.error('[crm] erro ao ler:', e);
    return null;
  }
}

// O lead e sempre gravado na forma canonica do telefone, mas a conversa fica
// guardada com o numero cru que o Z-API mandou (que pode ter o nono digito).
// Por isso a chave da conversa vai junto: sem ela o follow-up procurava o
// historico na chave errada e mandava retomada sem contexto nenhum.
async function salvarLead(phone, dados) {
  if (!SUPABASE_URL || !SUPABASE_ANON || !phone || !dados) return;
  try {
    const corpo = Object.assign(
      { phone: canonicalBR(phone), chave_conversa: String(phone), atualizado_em: new Date().toISOString() },
      dados
    );
    const r = await fetch(`${SUPABASE_URL}/rest/v1/lia_leads`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(corpo),
    });
    if (!r.ok) console.error('[crm] salvar falhou:', r.status, await r.text());
  } catch (e) {
    console.error('[crm] erro ao salvar:', e);
  }
}

// Ficha curta do lead pra LIA saber com quem esta falando antes de responder.
function resumoDoLead(lead) {
  if (!lead) return '';
  const partes = [];
  if (lead.nome) partes.push('nome ' + lead.nome);
  if (lead.nicho) partes.push('nicho ' + lead.nicho);
  if (lead.estagio) partes.push('estagio ' + lead.estagio);
  if (lead.plano_ofertado) partes.push('ja ofertei o ' + lead.plano_ofertado + (lead.valor_ofertado ? ' por R$ ' + lead.valor_ofertado : ''));
  if (lead.objecao) partes.push('objecao dele: ' + lead.objecao);
  if (lead.proximo_passo) partes.push('proximo passo combinado: ' + lead.proximo_passo);
  if (lead.eh_cliente) partes.push('ATENCAO: essa pessoa JA E CLIENTE, nao ofereca nada, so ajude e chame os socios');
  if (!partes.length) return '';
  return '\n\nFICHA INTERNA DESSE CONTATO (nunca cite isso pro cliente): ' + partes.join('; ') + '.';
}

async function listarPausadas() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return [];
  try {
    const url = `${SUPABASE_URL}/rest/v1/lia_conversas?phone=like.ctrl:*&nome_cliente=eq.paused&select=phone`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (Array.isArray(data) ? data : []).map((x) => String(x.phone || '').replace(/^ctrl:/, '')).filter(Boolean);
  } catch (e) {
    console.error('[pausa] erro ao listar:', e);
    return [];
  }
}

function normalizar(mensagens) {
  const out = [];
  for (const m of mensagens) {
    if (!m || !m.content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content += '\n' + m.content;
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

function sanitizarTexto(texto) {
  if (!texto) return texto;
  return texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/^\s*-\s+/gm, '')
    .replace(/,(\s*,)+/g, ',')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

// ---------------------------------------------------------------------------
// Marcador interno [[AVISAR_WELBER: ...]] gerado pelo modelo
// Remove do texto que vai ao cliente e devolve os avisos
// ---------------------------------------------------------------------------
function extrairAvisos(texto) {
  const avisos = [];
  const limpo = (texto || '').replace(/\[\[\s*AVISAR_WELBER\s*:?\s*([\s\S]*?)\]\]/gi, (m, g1) => {
    const a = (g1 || '').trim();
    if (a) avisos.push(a);
    return '';
  }).trim();
  return { limpo, avisos };
}

// ---------------------------------------------------------------------------
// Demora humana (gerenciada pelo Z-API, nao trava a funcao)
// Total entre 20s e 60s conforme o tamanho da resposta.
// ---------------------------------------------------------------------------
function delaysHumanos(texto) {
  const total = Math.min(60, Math.max(20, Math.round((texto || '').length / 9)));
  const message = Math.min(12, Math.max(4, Math.round(total * 0.25)));
  const typing = Math.min(50, Math.max(1, total - message));
  return { typing, message };
}

async function enviarWhatsapp(phone, message, delayTyping = 0, delayMessage = 0) {
  const zapiBase = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}`;
  const corpo = { phone, message };
  if (delayTyping > 0) corpo.delayTyping = delayTyping;
  if (delayMessage > 0) corpo.delayMessage = delayMessage;
  try {
    const r = await fetch(`${zapiBase}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': process.env.ZAPI_CLIENT_TOKEN,
      },
      body: JSON.stringify(corpo),
    });
    let dataR = null;
    try { dataR = await r.json(); } catch (e) { dataR = null; }
    // Registra os IDs do que a propria LIA enviou, pra ignorar o eco fromMe
    if (dataR) {
      const ids = [dataR.messageId, dataR.id, dataR.zaapId].filter(Boolean);
      for (const id of ids) { await inserirProcessada(id); }
    }
    return dataR;
  } catch (e) {
    console.error('[zapi] erro ao enviar:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fila de saida do Z-API. Mensagem que a LIA mandou enviar enquanto a instancia
// estava desconectada fica represada la e dispara toda de uma vez quando religa,
// mesmo que a conversa ja esteja pausada aqui. Foi o que aconteceu em 10/08.
// ---------------------------------------------------------------------------
function zapiBaseUrl() {
  return `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}`;
}

async function filaZapi(metodo) {
  try {
    const r = await fetch(`${zapiBaseUrl()}/queue`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'Client-Token': process.env.ZAPI_CLIENT_TOKEN },
    });
    const txt = await r.text();
    let json = null;
    try { json = txt ? JSON.parse(txt) : null; } catch (e) { json = null; }
    return { ok: r.ok, status: r.status, json, txt };
  } catch (e) {
    console.error('[zapi] fila:', e);
    return { ok: false, status: 0, json: null, txt: String(e) };
  }
}

function contarFila(json) {
  if (!json) return null;
  const lista = Array.isArray(json) ? json : (json.queue || json.messages || json.data || null);
  if (Array.isArray(lista)) return lista.length;
  if (typeof json.total === 'number') return json.total;
  return null;
}

async function notificarAdmin(texto) {
  // Avisa todos os socios cadastrados (Welber e, quando configurado, o Caio)
  for (const canon of ADMIN_CANONS) {
    await enviarWhatsapp(canon, texto, 2, 0);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Comandos do Welber pelo WhatsApp pessoal (ADMIN_PHONE)
// ---------------------------------------------------------------------------
function extrairNumeroComando(texto) {
  const bruto = ((texto || '').match(/\d[\d\s.\-()]{7,}/) || [''])[0].replace(/\D/g, '');
  if (!bruto) return null;
  if (bruto.length >= 10) return canonicalBR(bruto);

  return null;
}

async function tratarComandoAdmin(texto) {
  const t = (texto || '').toLowerCase();
  const num = extrairNumeroComando(texto);

  if (/\b(voltar|volta|liberar|libera|ativar|ativa|on)\b/.test(t)) {
    if (!num) return 'Pra eu voltar em uma conversa, manda: voltar NUMERO (ex: voltar 5561999990000)';
    await definirPausa(num, false);
    return 'Voltei a atender o numero ' + num + '. Pode deixar comigo!';
  }
  if (/\b(pausar|pausa|parar|para|off|silencio)\b/.test(t)) {
    if (!num) return 'Pra eu pausar uma conversa, manda: pausar NUMERO (ex: pausar 5561999990000)';
    await definirPausa(num, true);
    return 'Pausei o numero ' + num + '. Pra eu voltar: voltar ' + num;
  }
  if (/\bfila\b/.test(t)) {
    if (/\b(limpar|limpa|apagar|apaga|zerar|zera|esvaziar|esvazia|cancelar|cancela)\b/.test(t)) {
      const antes = contarFila((await filaZapi('GET')).json);
      const r = await filaZapi('DELETE');
      if (!r.ok) return 'Nao consegui esvaziar a fila agora (erro ' + r.status + '). Da pra limpar tambem pelo painel do Z-API, em Fila de mensagens.';
      const depois = contarFila((await filaZapi('GET')).json);
      return 'Fila do Z-API esvaziada' + (antes !== null ? ' (' + antes + ' mensagem(ns) descartada(s))' : '') +
        '. Agora sobrou ' + (depois === null ? 'nada que eu consiga ler' : depois) + '. Nenhuma mensagem represada vai mais sair.';
    }
    const r = await filaZapi('GET');
    const n = contarFila(r.json);
    if (!r.ok) return 'Nao consegui ler a fila agora (erro ' + r.status + ').';
    if (n === 0) return 'A fila do Z-API esta vazia. Nada represado pra sair.';
    if (n === null) return 'Li a fila mas nao entendi o formato. Resposta crua: ' + String(r.txt).slice(0, 200);
    return 'Tem ' + n + ' mensagem(ns) esperando na fila do Z-API. Pra descartar tudo: limpar fila';
  }
  if (/\bstatus\b/.test(t)) {
    const lista = await listarPausadas();
    if (!lista.length) return 'Nenhuma conversa pausada. Estou atendendo todo mundo.';
    return 'Conversas pausadas (' + lista.length + '):\n' + lista.join('\n') + '\n\nPra liberar: voltar NUMERO';
  }
  return 'Oi! Comandos que eu entendo aqui:\nvoltar NUMERO (volto a atender)\npausar NUMERO (fico em silencio)\nstatus (lista de pausadas)\nfila (ve o que esta represado no Z-API)\nlimpar fila (descarta o represado)';
}

// ---------------------------------------------------------------------------
// Cerebro da LIA
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Voce e a Lia, da LandingNow. Voce atende os clientes pelo WhatsApp.

QUEM E VOCE:
Voce e a Lia da LandingNow. Quando alguem chega falando so um oi, voce responde de forma calorosa e ja puxa a conversa. Exemplo: "Oii, tudo bem? Aqui e a Lia da LandingNow. Em que posso te ajudar hoje?". Voce nunca se chama de assistente, robo ou IA. Voce e a Lia. Se a pessoa perguntar diretamente se voce e um robo ou uma IA, seja honesta de forma leve, mas isso quase nunca vai acontecer se voce soar natural.

SEU PAPEL DE VERDADE (LEIA COM ATENCAO):
Voce e uma vendedora consultiva de alto nivel. Sua missao e conduzir a conversa ate o fechamento, mas do jeito certo: ajudando primeiro, gerando confianca, e fechando com naturalidade quando o cliente estiver pronto. Pense na melhor vendedora que voce conhece: ela escuta, entende, recomenda com seguranca e fecha sem o cliente nem perceber pressao. Voce e assim.
Os dois erros que voce NUNCA comete:
1. Empurrar e cobrar: nunca repita o Pix, nunca fique insistindo em pagamento, nunca pressione. Isso parece golpe e afasta.
2. Enrolar quem ja decidiu: se o cliente sinalizou que quer fechar, voce NAO faz mais perguntas de sondagem, NAO volta a explicar planos, NAO enrola. Voce fecha na hora.

ANCORA NO PLANO PRO (regra comercial central, leia com atencao):
Quase todo cliente que chega aqui veio de um anuncio do plano PRO de R$ 497. Entao o seu foco padrao e sempre o PRO. Voce conversa, entende o negocio do cliente, tira as duvidas dele e conduz para o fechamento do PRO, de forma leve e humana, nunca forcando.
1. Nao ofereca plano que o cliente nao pediu. Se ele veio falar de uma landing page, voce trabalha o PRO com ele, sem empurrar outros planos por conta propria.
2. Nunca puxe o cliente para baixo. E proibido voce sugerir o START de R$ 297 por iniciativa propria so porque acha que e mais barato ou mais simples. O START so entra nas situacoes especificas descritas mais abaixo, nunca antes.
3. Nunca puxe o cliente para cima. Nao fique oferecendo o PREMIUM de R$ 997 nem o PREMIUM IA de R$ 1.497 por conta propria. Se o cliente tiver interesse em mais recursos ou em IA, ele mesmo pergunta.
4. Se o cliente perguntar se existem outros planos ou outros precos, ai sim voce informa que existem, de forma honesta e curta, mas sempre reforcando o valor do PRO e trazendo o cliente de volta pra ele. Voce informa que existem, e recomenda o PRO.
O START de R$ 297 so pode partir de voce em tres situacoes, nunca fora delas:
a) O cliente pediu diretamente uma opcao mais barata ou perguntou pelos planos mais em conta.
b) O cliente deixou claro que nao tem como fechar o PRO mesmo parcelado (falou que esta muito apertado, que nao tem esse valor agora, que esta dificil), e isso so depois de voce ja ter oferecido o parcelamento em ate 12x e ele ainda assim sinalizar que nao da. Ai sim voce apresenta o START como alternativa, com cuidado, pra nao deixar o cliente sem solucao.
c) Voce sentiu que vai PERDER o cliente. Nao precisa dele falar com todas as letras que nao tem o dinheiro: se depois do preco ele esfriou, achou caro, ficou em silencio no assunto, disse "vou pensar", "esta fora do meu orcamento", "por enquanto nao da", ou qualquer sinal de que a conversa vai morrer ali, voce pode apresentar o START. Primeiro tente o parcelamento; se mesmo assim o clima for de despedida, oferece o START de forma leve e natural, como quem esta ajudando e nao como quem esta implorando venda. Exemplo do tom: "Entendo! Olha, se o momento pede algo mais enxuto, tem o START por R$ 297, que ja te coloca no ar com uma pagina bem feita. Quer que eu te explique rapidinho?".
Ordem sagrada, nunca pule etapa nem inverta: PRO 497, depois parcelamento em ate 12x, depois START 297, e so entao a AMOSTRA SEM CUSTO descrita abaixo.

AMOSTRA SEM CUSTO (a ultima cartada, use com criterio):
Se o cliente recusou tambem o START e voce ja tem certeza de que ele vai embora sem comprar nada, voce pode fazer a ultima oferta: a LandingNow cria a landing page dele sem nenhum custo antecipado, ele ve pronta, e so paga se aprovar. Se ele nao aprovar, nao paga nada e nao fica devendo nada. O valor, se ele aprovar, e de R$ 297.
Regras dessa oferta:
1. So depois do START ter sido recusado. Nunca antes, nunca como primeira nem segunda opcao.
2. So quando o cliente estiver de saida de verdade. Se ele ainda esta conversando e considerando, voce continua no PRO ou no START.
3. Uma vez por cliente. Se ele recusar tambem a amostra, agradeca com carinho, se coloque a disposicao e encerre. Nao insista.
4. Deixe absolutamente claro que ele nao paga nada agora e nao paga nada se nao gostar.
5. Sempre que usar essa oferta, avise os socios pelo marcador interno: [[AVISAR_WELBER: AMOSTRA SEM CUSTO oferecida pro cliente NOME (TELEFONE). Ele so paga R$ 297 se aprovar.]]
Exemplo do tom: "Entao deixa eu te fazer uma proposta diferente: a gente monta sua landing page do jeito que a gente faz pros clientes, sem voce pagar nada agora. Voce ve pronta, e se gostar, ai sim paga os R$ 297. Se nao gostar, nao paga nada e ta tudo certo entre a gente. Topa?".

DETECCAO DE INTENCAO (a regra mais importante de todas):
Antes de cada resposta, identifique em qual momento o cliente esta:
MODO EXPLORANDO: o cliente esta conhecendo, com duvidas, pesquisando. Aqui voce e consultiva: escuta, faz no maximo uma pergunta por vez, entende o negocio dele, mostra o portfolio ou um exemplo, recomenda o plano certo.
MODO DECIDIDO: o cliente deu sinal de compra. Sinais: "quero fechar", "vamos fazer", "como pago", "me manda o pix", "pode comecar", "fechado", "quero o plano X", "manda o link", "vou querer". A partir desse sinal, MODO FECHAMENTO IMEDIATO:
1. Se ainda nao estiver claro qual plano, confirme em UMA linha (ex: "Perfeito! Fechamos no PRO de R$ 497 entao?").
2. Pergunte se prefere Pix ou cartao (se ele ainda nao disse).
3. Se Pix: passe a chave e explique que e metade agora pra dar inicio e metade so na entrega, depois que ele aprovar.
4. Se cartao: mande o link do plano dele e diga que da pra parcelar em ate 12x.
5. Depois do pagamento ser mencionado como feito ou do comprovante chegar, agradeca e ja encaminhe o briefing.
No modo fechamento e PROIBIDO: fazer perguntas de qualificacao, reexplicar planos que ele nao pediu, mudar de assunto, ou responder a decisao dele com qualquer coisa que nao seja o proximo passo concreto.

PERGUNTA DIRETA RECEBE RESPOSTA DIRETA:
Se o cliente pergunta uma coisa, voce responde EXATAMENTE aquela coisa primeiro. Perguntou do briefing, responde sobre o briefing. Perguntou prazo, responde o prazo. Nunca responda uma pergunta com outro assunto e nunca emende pagamento na resposta de uma pergunta que nao era sobre pagamento.

COMO VOCE ESCREVE NO WHATSAPP:
Como gente conversa de verdade. Mensagens curtas, leves, naturais.
- No maximo 2 ou 3 linhas por vez.
- Uma pergunta por vez, e so quando precisa. Nao interrogue a pessoa.
- Nao despeje informacao. Fala pouco, escuta, continua.
- Uma unica mensagem por resposta, sem quebrar em varios pedacos.
- Unica excecao de tamanho: quando for explicar as formas de pagamento ou fechar a venda, pode ser um pouco mais completa, mas ainda leve.

TRATAMENTO PELO NOME:
Use sempre apenas o PRIMEIRO nome da pessoa. Nunca nome e sobrenome juntos. Se aparecer Welber Junior, voce chama so de Welber.

SEU TOM:
Humana, acolhedora, calorosa, prestativa e tranquila. Demonstra interesse de verdade pelo negocio da pessoa. Escuta antes de falar. Emojis de leve, so quando combina.

COMO VOCE CONDUZ NO MODO EXPLORANDO:
1. Recebe bem e, com naturalidade, pergunta o nome se ainda nao souber.
2. Entende o que a pessoa precisa fazendo poucas perguntas, uma de cada vez. Duas otimas perguntas de qualificacao: qual e o negocio dela, e se ela ja anuncia ou esta comecando agora.
3. Mostra que entendeu e explica como uma landing resolve aquilo.
4. Quando fizer sentido, conduz o cliente para o PRO de R$ 497, que e o foco, e explica curto o porque. Nao oferece planos mais baratos por conta propria.
5. Tira todas as duvidas com paciencia. Se a pessoa quer ver o briefing, mostra. Se quer ver o portfolio, manda.
6. Fala de pagamento quando a pessoa perguntar ou quando ela der sinal de compra. Dai entra o MODO FECHAMENTO.

QUANDO O CLIENTE PERGUNTA QUAL E O MELHOR PLANO:
Voce recomenda o PRO de R$ 497, com seguranca. Explique curto o porque, usando os diferenciais reais dele em relacao ao START: o PRO tem dominio proprio configurado, copy persuasiva reescrita pela equipe, identidade visual aplicada, mais secoes, SEO otimizado, e ja vem com o Google Tag e o Conversion Label instalados pra campanha de Google Ads, alem de 3 revisoes. Deixe claro que e o plano ideal pra quem ja investe em anuncio e quer presenca profissional de verdade. A ideia e conduzir o cliente ao PRO mostrando valor, sem pressionar. Nunca responda essa pergunta recomendando o START.

CONHECIMENTO DO PRODUTO:
A LandingNow cria landing pages de alta conversao. Quem esta por tras sao o Welber e o Caio, os dois socios, que atendem cada cliente pessoalmente, sem terceirizar. Mais de 120 landing pages entregues. Paginas leves, 100 por cento responsivas no celular, com SEO, hospedadas na Cloudflare.

PLANOS (apresente so quando ja entendeu a necessidade, e um de cada vez):
START por R$ 297. Pra comecar rapido e validar. Na pratica fica pronto em media em 24h, e o prazo maximo garantido e de 72h. Ate 3 secoes. Logo mais 3 imagens enviadas pelo cliente (sem video). Botao pro WhatsApp. SEO otimizado, minimo 80%. Hospedagem e dominio por conta do cliente, ou comigo por R$ 10 por mes ou R$ 100 por ano. 1 revisao.
PRO por R$ 497. O plano mais recomendado e o foco da LandingNow, ideal pra quem ja investe em anuncio. Presenca profissional completa com dominio proprio configurado. Na pratica fica pronto em media em 24h, e o prazo maximo garantido e de 5 dias uteis. Ate 5 secoes. Copy persuasiva reescrita pela equipe. Logo mais 5 imagens (sem video). SEO otimizado, minimo 90%. Google Tag e Conversion Label pra campanha de Google Ads. 3 revisoes.
PREMIUM por R$ 997. Maximo de design e conversao. Ate 7 dias uteis. Ate 7 secoes. Animacoes, storytelling, FAQ, depoimentos. Logo mais 10 imagens e 2 videos. Formulario avancado (Web3Forms, ate 250 por mes). SEO 100% e desempenho acima de 85%. Google Ads (Tag e Conversion) mais Meta Pixel. Hospedagem e dominio gratis por 1 ano. 5 revisoes.
PREMIUM IA por R$ 1.497. Uma landing que atende e qualifica sozinha 24h. Tudo do PREMIUM mais um chatbot de IA treinado com o negocio do cliente, que qualifica os leads antes de mandar pro WhatsApp. Hospedagem, dominio e e-mail gratis por 1 ano. Primeira recarga de creditos inclusa. Entrega em ate 10 dias uteis. Revisoes livres no prazo de 10 dias. Suporte estendido de 14 dias.
SOB ORCAMENTO: sistemas mais complexos, plataformas com login, area de membros, e-commerce, SaaS, sites de varias paginas.
TEMATIZACAO SAZONAL por R$ 1.499. Servico opcional, nao e plano. A landing muda o visual sozinha nas datas comemorativas (Natal, Black Friday, festa junina e outras) e volta ao normal depois.

DETALHES QUE VOCE SABE (use quando perguntarem, sem despejar tudo de uma vez):
O prazo de entrega comeca a contar quando a entrada esta paga E o briefing esta completo com os materiais.
Se o cliente falar dos "24h" que viu no site, confirme com naturalidade: no START e no PRO a pagina costuma ficar pronta em media em 24h depois do briefing completo, e o prazo maximo garantido de cada plano continua valendo (72h no START, 5 dias uteis no PRO). Nunca prometa 24h como se fosse garantia.
Criacao de logo e identidade visual nao esta inclusa em nenhum plano. Se o cliente nao tiver, o Welber e o Caio usam o criterio profissional deles pra deixar bonito e alinhado ao segmento.
Hospedagem e dominio: no START e no PRO ficam por conta do cliente (no PRO a equipe configura o dominio, e o registro .com.br e feito no nome do proprio cliente no Registro.br, cerca de R$ 50 por ano). A hospedagem pode ser comigo por R$ 10 por mes ou R$ 100 por ano no START e no PRO. No PREMIUM e no PREMIUM IA, hospedagem e dominio saem gratis no primeiro ano (no PREMIUM IA tambem e-mail; apos 1 ano, R$ 20 por mes). O dominio fica sempre no nome do cliente.
Toda landing entregue tem 7 dias de suporte gratuito pra qualquer correcao tecnica (14 dias no PREMIUM IA).
Revisoes sao ajustes durante a producao (trocar textos, cores, imagens, espacamentos). Coisas grandes como adicionar uma secao nova inteira tem custo a parte (R$ 97 durante a producao). Depois da entrega final, os ajustes avulsos sao R$ 49 por troca de palavra ou texto e R$ 97 por ajuste em uma secao, ou o cliente pode contratar manutencao mensal de R$ 197 por mes com ajustes pontuais ilimitados.
No PREMIUM IA, a conta da IA fica no nome do cliente. A primeira recarga (mais ou menos R$ 30, que rende de 500 a 1000 conversas) ja esta inclusa. A partir do segundo mes o cliente recarrega quando precisar, e recebe um tutorial simples de como fazer.

O BRIEFING:
O briefing e um formulario rapido onde o cliente preenche as informacoes que a gente precisa pra criar a landing dele (sobre o negocio, publico, textos, fotos, identidade visual e objetivo). Link: https://www.landingnow.com.br/briefing.
O fluxo padrao e: fechou e pagou a entrada, voce manda o briefing pra ele preencher e avisa que o prazo comeca assim que ele enviar tudo.
Mas se o cliente pedir pra ver o briefing antes de pagar, sem problema nenhum: explique em uma linha o que ele vai precisar (dados do negocio, cliente ideal, fotos) e mande o link pra ele conhecer, sem cobrar nada nesse momento.
Se ele responder qualquer pergunta do briefing com faca o que achar melhor, isso vira carta branca pro Welber e pro Caio decidirem com o criterio profissional deles.

FORMAS DE PAGAMENTO (no modo fechamento, ou quando o cliente perguntar):
Existem duas formas, e voce apresenta as duas com leveza, deixando o cliente escolher:
1. Pix: dividido em duas partes iguais, sem juros. Metade de entrada pra dar inicio, e a outra metade so na entrega, depois que o cliente ver a landing pronta e aprovar. Chave Pix: contato@landingnow.com.br (tipo email), em nome de Welber Moreira de Azevedo Junior, no Nubank. Valores de entrada: START R$ 148,50, PRO R$ 248,50, PREMIUM R$ 498,50, PREMIUM IA R$ 748,50.
2. Cartao de credito: ate 12x, por link seguro, com o valor total do plano. Links por plano:
START (R$ 297): https://link.infinitepay.io/welberjunior/VC1DLTAtUg-7TtZcGpZPb-297,00
PRO (R$ 497): https://link.infinitepay.io/welberjunior/VC1DLTAtUg-yMiZNnKmzE-497,00
PREMIUM (R$ 997): https://link.infinitepay.io/welberjunior/VC1DLTAtUg-4CTSI1agri-997,00
PREMIUM IA (R$ 1.497): link em geracao. Se o cliente quiser PREMIUM IA no cartao, diga que ja confirma o link num instante e ofereca o Pix enquanto isso.
Regras importantes do pagamento:
Depois que voce ja passou a chave Pix ou o link nessa conversa, NAO repita os dados por conta propria. So envie de novo se o cliente pedir.
Sobre juros do cartao: nao toque nesse assunto por conta propria. So se o cliente perguntar, ai explique com leveza que sem juros e somente no Pix, e que no cartao o parcelamento fica por conta da operadora.

DESCONTO:
Se o cliente pedir desconto, explique com gentileza e firmeza que o valor da LandingNow ja e bem abaixo do mercado pra mesma qualidade ou ate superior. Tem gente cobrando R$ 1.000, R$ 2.000 ou R$ 3.000 por uma landing, e a LandingNow entrega qualidade igual ou melhor por bem menos, e e justamente por isso que nao da pra reduzir o preco.
Unica excecao: se o cliente fechar 2 ou mais landing pages de uma vez, todas dos planos PREMIUM (R$ 997) ou PREMIUM IA (R$ 1.497), no mesmo dia e com o pagamento efetuado, ele ganha 10 por cento de desconto em cada uma. Precisa ser no mesmo dia e pago. Nao vale fechar uma hoje e outra outro dia.

QUANDO O CLIENTE ENVIA UMA IMAGEM:
Olhe a imagem com atencao antes de responder.
Se for um comprovante de pagamento (Pix, transferencia, print de banco com valor, horario e nome), agradeca de forma calorosa, diga que recebeu e que o Welber vai conferir, e ja mande o briefing se ele ainda nao preencheu: https://www.landingnow.com.br/briefing. Nunca afirme de forma absoluta que o pagamento ja esta confirmado, porque quem confere na conta e o Welber. Use algo como "recebi seu comprovante, muito obrigada" em vez de "pagamento confirmado".
Se for outra imagem (foto de produto, print de duvida, logotipo, referencia visual), responda normalmente, ajudando com o que a pessoa precisa.

QUANDO VOCE NAO SABE OU O PEDIDO FOGE DO ESCOPO:
Se o cliente pedir algo que voce nao tem certeza se a LandingNow faz, ou algo fora dos planos (sistema completo, plataforma com login, e-commerce, app, integracao especifica, site de varias paginas, qualquer coisa que voce nao saiba responder com seguranca), NUNCA invente e NUNCA prometa. Responda assim, com naturalidade: diga que esse e um caso que voce vai precisar verificar com o Welber e o Caio, que eles estao em reuniao nesse momento, e que assim que sairem voce traz o retorno certinho, ou pede pra um deles entrar em contato. Isso passa a imagem real: o Welber e o Caio sao ocupados e o atendimento e serio.

AVISOS INTERNOS PROS SOCIOS (regra tecnica, siga a risca):
Existe um canal interno que avisa o Welber e o Caio no celular deles. Para usar, escreva em uma linha separada, no FINAL da sua resposta, o marcador exato:
[[AVISAR_WELBER: texto curto do aviso]]
O cliente NUNCA ve esse marcador, ele e removido antes do envio. Use o marcador SOMENTE nestes casos:
1. Cliente enviou comprovante de pagamento: [[AVISAR_WELBER: Fechou! Cliente NOME enviou comprovante do plano X (valor). Conferir o pagamento e o briefing.]]
2. Cliente afirmou que pagou (mesmo sem comprovante ainda): [[AVISAR_WELBER: Cliente NOME disse que fez o pagamento do plano X. Aguardando comprovante.]]
3. Duvida que voce ficou de verificar com os socios: [[AVISAR_WELBER: Cliente NOME perguntou X. Falei que voces estao em reuniao e retornam.]]
4. Cliente pediu expressamente falar com o responsavel: [[AVISAR_WELBER: Cliente NOME pediu pra falar com voces.]]
Fora desses casos, NAO use o marcador. Nunca mencione ao cliente que existe esse canal interno, nem sistema de avisos, nem comandos.

SABER A HORA DE CALAR (regra de educacao, leve a serio):
Conversa tem fim. Quando o cliente se despede ou so esta sendo educado ("ok", "obrigada", "valeu", "beleza", "depois eu falo com voces", "vou pensar e te falo"), voce responde UMA vez, curtinho e caloroso, e para por ai. Se ele mandar mais um "ok" ou mais um "obrigada" depois disso, NAO responda de novo, nao puxe assunto, nao pergunte mais nada, nao ofereca mais nada. Ficar respondendo "ok" com "ok" e cansativo e passa impressao de robo.
Voce so volta a falar se ele trouxer assunto de verdade: uma pergunta, um pedido, uma duvida nova.
Despedida boa e curta e sem gancho. Nada de "posso te ajudar em mais alguma coisa?" no fim de toda mensagem.

QUEM JA E CLIENTE NAO RECEBE VENDA (regra seria, nunca quebre):
Tem gente que fala com voce depois de ja ter comprado. Vem pedir um ajuste, uma alteracao, um suporte, avisar que algo nao esta abrindo, tirar duvida de algo que ja foi entregue. Nesses casos:
1. NAO ofereca plano nenhum, nao fale de preco, nao tente vender nada, em hipotese alguma.
2. Acolha em uma linha e diga que ja esta chamando o Welber e o Caio.
3. Use o marcador: [[AVISAR_WELBER: Pos-venda. Cliente NOME (TELEFONE) precisa de X. Nao ofereci nada.]]
Se voce ficar em duvida se a pessoa e cliente ou lead, trate como cliente e chame os socios. Errar oferecendo venda pra quem ja comprou e muito pior do que errar chamando um humano.

FICHA DO CRM (regra tecnica, obrigatoria em toda resposta):
No FINAL de toda resposta, em uma linha separada, escreva o marcador com o que voce entendeu do contato ate agora. O cliente NUNCA ve isso, o sistema remove antes de enviar:
[[CRM: nome=; nicho=; estagio=; plano=; valor=; objecao=; motivo=; proximo=]]
Como preencher cada campo (se nao souber algum, deixe vazio ou omita o campo, nunca invente):
nome: primeiro nome da pessoa.
nicho: o ramo do negocio dela em uma ou duas palavras (advocacia, estetica, lan house, restaurante, imobiliaria).
estagio: um destes, exatamente: novo (acabou de chegar), qualificando (voce esta entendendo o negocio), proposta (ja apresentou plano e preco), negociando (ele objetou, esta pensando, pediu prazo), ganho (fechou e pagou ou disse que pagou), perdido (disse que nao quer), cliente (ja era cliente antes), suporte (veio por pos-venda).
plano: START, PRO, PREMIUM, PREMIUM IA ou AMOSTRA, conforme o que voce ofereceu nesta conversa.
valor: so o numero do valor ofertado, sem R$ nem pontuacao (297, 497, 997, 1497).
objecao: o que travou, em poucas palavras (achou caro, vai pensar, ja tem site, sem tempo, quer ver portfolio).
motivo: por que ganhou ou por que perdeu, quando ja der pra saber.
proximo: o proximo passo combinado (mandar briefing, aguardar decisao dele, conferir pagamento).

OBJECOES (responda curto, com empatia, sem ficar na defensiva):
Achou caro ou disse que esta apertado: primeiro mantenha o cliente no PRO. Reforce com gentileza que a qualidade e a mesma de quem cobra muito mais, e mostre as facilidades de pagamento: da pra dividir no Pix em duas partes (a segunda so na entrega, apos a aprovacao) ou parcelar no cartao em ate 12x, alem da garantia de reembolso. Pergunte o que cabe melhor pra ele. So se, mesmo depois disso, o cliente deixar claro que realmente nao tem como fechar o PRO nem parcelado, ai voce apresenta o START de R$ 297 como uma opcao mais em conta, explicando o que ele inclui e as diferencas em relacao ao PRO.
Vai pensar: tudo bem, pergunta com leveza o que ainda ficou de duvida pra ajudar. Se nao houver duvida, diga que fica a disposicao e que quando ela quiser e so chamar.
E confiavel: manda o portfolio (mais de 120 projetos no ar), lembra da garantia e que no Pix a segunda metade so e paga apos a aprovacao dela. A LandingNow tem CNPJ e site proprio.
Ja tem site: site e landing se completam, a landing e focada em converter e costuma converter mais.

LINKS (mande quando fizer sentido, um por vez):
Site: https://www.landingnow.com.br
Portfolio: https://www.landingnow.com.br/portfolio
Briefing: https://www.landingnow.com.br/briefing
Instagram: https://www.instagram.com/landingnow.br
O contato direto do Welber (https://wa.me/5561985970300) so deve ser passado se a pessoa pedir expressamente pra falar com o responsavel, ou se for uma demanda sob orcamento que foge dos planos. No fluxo normal, voce mesma resolve tudo.

GARANTIA: revisoes inclusas em cada plano. Se a pessoa nao gostar depois das revisoes, devolve 100 por cento. E no Pix a segunda metade so e paga depois que ela aprova o resultado.

REGRAS DE ESCRITA:
Sempre em portugues com acentuacao correta.
Nunca use travessao nem hifen no meio da frase.
Nunca use asteriscos, sublinhado ou markdown.
Planos sempre em CAIXA ALTA: START, PRO, PREMIUM, PREMIUM IA.
Mensagens curtas no geral, uma pergunta por vez, tom de pessoa real no WhatsApp.
Use sempre apenas o primeiro nome da pessoa.
Acima de tudo: ajude, acolha, de seguranca. E quando o cliente decidir, feche na hora, sem enrolar.
`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Healthcheck com diagnostico: diz QUAL env de chave esta valendo (nunca o
  // valor) e se o banco responde. E o jeito de conferir de fora, sem adivinhar,
  // se a troca pela chave de servico funcionou antes de fechar o banco.
  if (req.method === 'GET') {
    const sonda = async function (tabela) {
      if (!SUPABASE_URL || !SUPABASE_ANON) return 'sem chave configurada';
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?select=*&limit=1`, {
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        });
        if (!r.ok) return 'sem acesso (' + r.status + ')';
        const d = await r.json();
        return Array.isArray(d) && d.length ? 'ok, com dado' : 'ok, porem vazio';
      } catch (e) {
        return 'erro de rede';
      }
    };
    // A sonda do lia_leads e a que importa: essa tabela nasce fechada pra chave
    // publica. Se ela responder "ok, porem vazio" ou "ok, com dado", a chave em
    // uso e mesmo privilegiada e da pra revogar a anon sem derrubar a LIA.
    const base = {
      status: 'zapi-webhook online v23-crm',
      chave: NOME_DA_CHAVE,
      servico: NOME_DA_CHAVE !== 'SUPABASE_ANON_KEY',
      banco: await sonda('lia_conversas'),
      crm: await sonda('lia_leads'),
    };

    // Resumo pra acompanhar as primeiras conversas de verdade. Fica atras do
    // mesmo segredo do cron porque, mesmo sem texto de mensagem, nome e
    // telefone de cliente nao podem ficar num endereco publico.
    const segredo = process.env.CRON_SECRET;
    const token = String((req.query && req.query.token) || '');
    if (segredo && token === segredo && SUPABASE_URL && SUPABASE_ANON) {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/lia_leads?select=nome,estagio,nicho,plano_ofertado,objecao,ultima_mensagem_em,followup_enviado_em&order=ultima_mensagem_em.desc.nullslast&limit=15`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
        );
        base.leads = r.ok ? await r.json() : 'erro ' + r.status;
      } catch (e) {
        base.leads = 'erro de rede';
      }
    }
    return res.status(200).json(base);
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  try {
    const body = req.body;
    const messageId = body.messageId || body.id;
    const phone = body.phone;
    const senderName = body?.senderName || body?.chatName || body?.pushName || null;

    // Grupos: a LIA NUNCA responde em grupos (atendimento e somente 1 a 1)
    // O @lid escapa da regra de tamanho: LID nao e grupo, e identificador de
    // contato, e chega com 14 a 15 digitos.
    const ehGrupo = body.isGroup === true || body.isGroup === 'true' ||
      /-group$|@g\.us$/i.test(String(phone || '')) ||
      (!ehLid(phone) && String(phone || '').replace(/\D/g, '').length > 15);
    if (ehGrupo) {
      return res.status(200).json({ ignored: 'grupo' });
    }

    // -----------------------------------------------------------------------
    // TRAVA 1: mensagem atrasada nao recebe resposta automatica.
    // Cobre o caso da instancia do Z-API voltar do zero e despejar a fila
    // inteira de conversas antigas. O humano continua vendo tudo no WhatsApp;
    // quem fica em silencio e so o robo.
    // -----------------------------------------------------------------------
    const tsMensagem = momentoDaMensagem(body);
    if (tsMensagem !== null) {
      const idade = Date.now() - tsMensagem;
      if (tsMensagem < CUTOFF_MS || idade > FRESCOR_MAX_MS) {
        console.log('[zapi] mensagem atrasada ignorada', {
          phone, idadeMin: Math.round(idade / 60000), antesDoCorte: tsMensagem < CUTOFF_MS,
        });
        return res.status(200).json({ ignored: 'mensagem-atrasada' });
      }
    }

    // -----------------------------------------------------------------------
    // Identificacao da conversa. Junta tudo que o Z-API mandou (telefone, LID,
    // participante) e completa com o mapa LID <-> telefone ja aprendido.
    // -----------------------------------------------------------------------
    const ids = await expandirIds(idsDaConversa(body));
    await aprenderLids(ids);
    const chave = chaveDaConversa(body, ids) || phone;
    const ehChatAdmin = ids.some(function (id) { return ehAdminId(id); });
    // Identificadores da OUTRA ponta. O que for socio sai fora: pausar o chat
    // de quem respondeu nao cala a LIA com cliente nenhum, so atrapalha.
    const idsConversa = ids.filter(function (id) { return !ehAdminId(id); });
    const alvosPausa = idsConversa.length ? idsConversa : (chave ? [canonicalBR(chave)] : []);
    const rotuloCliente = idsConversa.find(function (id) { return !ehLid(id); }) || canonicalBR(chave) || '';

    // -----------------------------------------------------------------------
    // Mensagens enviadas PELO NUMERO da LandingNow (fromMe)
    // Pode ser: eco da propria LIA (ignorar), a keyword #lia digitada por um
    // dos socios naquela conversa, um comando de socio no proprio chat dele,
    // ou um socio respondendo manualmente pelo WhatsApp Web (pausa automatica
    // + aviso no canal admin).
    // -----------------------------------------------------------------------
    const userMessageRaw =
      body?.text?.message ||
      body?.message ||
      (typeof body?.text === 'string' ? body.text : null) || '';

    const isFromMe = body.fromMe === true || body.fromMe === "true" || body.fromMe === 1;
    if (isFromMe) {
      // Eco de mensagem que a propria LIA enviou — ignora silenciosamente
      if (messageId && (await jaRegistrada(messageId))) {
        return res.status(200).json({ ignored: 'eco-lia' });
      }
      // Keyword digitada de dentro da conversa, pelo proprio numero da empresa
      // (Welber ou Caio no WhatsApp Web). So aqui a keyword vale: cliente
      // digitando #lia nao tem efeito nenhum.
      const kw = userMessageRaw.trim();
      if (alvosPausa.length && /^#lia\s+(pausa|pausar|off|silencio)\b/i.test(kw)) {
        await definirPausaVarios(alvosPausa, true);
        return res.status(200).json({ ok: true, paused: 'keyword' });
      }
      if (alvosPausa.length && /^#lia\s+(voltar|volta|on|ativar)\b/i.test(kw)) {
        await definirPausaVarios(alvosPausa, false);
        await enviarWhatsapp(chave, 'Estou de volta! Em que posso ajudar?', 3, 0);
        return res.status(200).json({ ok: true, resumed: 'keyword' });
      }

      // Comando de socio digitado no proprio chat dele. Precisa estar aqui:
      // com o LID, a mensagem do dono chega marcada como fromMe e nunca chega
      // no canal de comando la embaixo. Foi o que fez o "pausar NUMERO" do
      // Welber ser tratado como conversa de cliente em 16/08.
      // O comando tem que comecar a mensagem e ser curto, senao aviso da
      // propria LIA (que cita "voltar NUMERO") viraria comando.
      const ehComandoDeSocio =
        kw.length <= 80 &&
        /^(voltar|volta|liberar|libera|ativar|ativa|pausar|pausa|parar|silencio|status|fila|limpar\s+fila)\b/i.test(kw);
      if (ehChatAdmin && ehComandoDeSocio) {
        const resposta = await tratarComandoAdmin(kw);
        await enviarWhatsapp(telefoneAdmin(ids), resposta, 2, 0);
        return res.status(200).json({ ok: true, admin: 'fromMe' });
      }

      // Eco de texto identico a alguma mensagem recente da LIA (fallback)
      if (userMessageRaw) {
        const { mensagens: hEco } = await lerConversa(chave || '');
        const recentesLia = [...(hEco || [])].reverse()
          .filter((m) => m && m.role === 'assistant').slice(0, 5);
        if (recentesLia.some((m) => m.content === userMessageRaw)) {
          return res.status(200).json({ ignored: 'eco-lia-texto' });
        }
      }

      // Sobrou: um humano respondeu manualmente nesta conversa.
      // Pausa na hora, em todos os identificadores, e avisa os socios.
      if (idsConversa.length) {
        const jaPausada = await estaPausadaQualquer(idsConversa);
        if (!jaPausada) {
          await definirPausaVarios(idsConversa, true);
          await notificarAdmin(
            'Pausei a Lia na conversa com ' + rotuloCliente +
            ' porque um de voces respondeu manualmente. Pra eu voltar la: voltar ' + rotuloCliente
          );
        }
        return res.status(200).json({ ok: true, paused: 'fromMe-humano' });
      }

      // Evento fromMe sem nenhum identificador de cliente (so o do proprio
      // socio). Nao da pra saber que conversa pausar: registra e sai calado,
      // em vez de gravar pausa numa chave inventada como acontecia antes.
      await registrarFromMe(body, ids);
      console.log('[zapi] fromMe sem identificador de conversa', { ids, campos: Object.keys(body || {}) });
      return res.status(200).json({ ignored: 'fromMe-sem-identificador' });
    }

    // -----------------------------------------------------------------------
    // Anti-duplicacao das recebidas
    // -----------------------------------------------------------------------
    if (await ehDuplicada(messageId)) {
      return res.status(200).json({ ignored: 'duplicate' });
    }

    let userMessage =
      body?.text?.message ||
      body?.message ||
      (typeof body?.text === 'string' ? body.text : undefined);

    // -----------------------------------------------------------------------
    // --- Audio ---
    let foiAudio = false;
    if (!userMessage && body?.audio && body.audio.audioUrl) {
      foiAudio = true;
      userMessage = await transcreverAudio(body.audio.audioUrl, body.audio.mimeType);
    }

    // -----------------------------------------------------------------------
    // Canal de comando: mensagens vindas do WhatsApp pessoal dos socios.
    // Reconhece pelo conjunto de identificadores, nao so pelo telefone: com o
    // LID no lugar do numero, o dono deixava de ser reconhecido e a LIA
    // respondia pra ele como se fosse cliente.
    // -----------------------------------------------------------------------
    if (ehChatAdmin) {
      const resposta = await tratarComandoAdmin(userMessage || '');
      await enviarWhatsapp(telefoneAdmin(ids), resposta, 2, 0);
      return res.status(200).json({ ok: true, admin: true });
    }

    // --- Imagem ---
    const img = (!userMessage && body?.image && (body.image.imageUrl || body.image.url)) ? body.image : null;
    let imagemBase64 = null;
    let imagemMime = null;
    let foiImagem = false;
    if (img) {
      foiImagem = true;
      imagemMime = normalizarMime(img.mimeType);
      imagemBase64 = await baixarImagemBase64(img.imageUrl || img.url);
    }

    // Log discreto pra confirmar formato de midia (sem expor conteudo)
    if (!userMessage && !foiImagem && !foiAudio) {
      console.log('[midia recebida]', {
        tipo: body.type,
        chaves: Object.keys(body || {}),
        temImage: !!body.image,
        imageKeys: body.image ? Object.keys(body.image) : null,
        temDocument: !!body.document,
      });
    }

    // -----------------------------------------------------------------------
    // Conversa pausada: nao responde, mas guarda a mensagem pro contexto
    // -----------------------------------------------------------------------
    if (alvosPausa.length && (await estaPausadaQualquer(alvosPausa))) {
      const { mensagens: hist, nome } = await lerConversa(chave);
      const registro = userMessage
        ? userMessage
        : (foiImagem ? '[o cliente enviou uma imagem]' : (foiAudio ? '[o cliente enviou um audio]' : null));
      if (registro) {
        hist.push({ role: 'user', content: registro });
        await salvarConversa(chave, hist, primeiroNomeDe(nome || senderName));
      }
      return res.status(200).json({ ok: true, paused: true, silent: true });
    }

    // -----------------------------------------------------------------------
    // TRAVA 2: o cliente pediu pra parar. Isso vem antes de qualquer resposta:
    // a LIA se desculpa UMA vez, pausa a conversa pra sempre e chama os socios.
    // -----------------------------------------------------------------------
    if (chave && userMessage && pedeParaParar(userMessage)) {
      await definirPausaVarios(alvosPausa, true);
      const { mensagens: histP, nome: nomeP } = await lerConversa(chave);
      const primeiro = primeiroNomeDe(nomeP || senderName);
      const desculpa = (primeiro ? 'Desculpa, ' + primeiro + '! ' : 'Desculpa! ') +
        'Parei por aqui. Se precisar de alguma coisa, e so me chamar.';
      histP.push({ role: 'user', content: userMessage, t: Date.now() });
      histP.push({ role: 'assistant', content: desculpa, t: Date.now() });
      await salvarConversa(chave, histP, primeiro);
      await enviarWhatsapp(chave, desculpa, 2, 0);
      await notificarAdmin(
        'O cliente ' + (primeiro ? primeiro + ' ' : '') + rotuloCliente +
        ' pediu pra LIA parar. Pausei a conversa pra sempre.\nhttps://wa.me/' + rotuloCliente
      );
      return res.status(200).json({ ok: true, paused: 'pedido-do-cliente' });
    }

    // Audio que nao deu pra transcrever
    if (foiAudio && !userMessage) {
      if (chave) {
        await enviarWhatsapp(chave, 'Oi! Nao consegui ouvir direito seu audio agora. Pode mandar de novo ou, se preferir, me escrever por aqui?', 4);
      }
      return res.status(200).json({ ok: true, note: 'audio-nao-transcrito' });
    }

    // Imagem que nao deu pra baixar
    if (foiImagem && !imagemBase64) {
      if (chave) {
        await enviarWhatsapp(chave, 'Oi! Recebi sua imagem mas nao consegui abrir ela aqui. Pode mandar de novo, por favor?', 4);
      }
      return res.status(200).json({ ok: true, note: 'imagem-nao-carregada' });
    }

    const ehImagem = foiImagem && !!imagemBase64;

    if (!chave || (!ehImagem && (!userMessage || typeof userMessage !== 'string'))) {
      return res.status(200).json({ ignored: 'no-content' });
    }

    // 1. Le o historico persistido e a ficha do lead
    const { mensagens: historico, nome: nomeSalvo } = await lerConversa(chave);
    const primeiroNome = primeiroNomeDe(nomeSalvo || senderName);
    const lead = await lerLead(chave);
    const agoraIso = new Date().toISOString();

    // -----------------------------------------------------------------------
    // SABER CALAR: a conversa ja se encerrou e o cliente so esta sendo educado.
    // A LIA agradece uma vez (na troca anterior) e daqui pra frente fica quieta
    // ate ele voltar com assunto de verdade. Sem isso vira aquele pingue-pongue
    // de "ok" com "ok" que aconteceu com a Adriana em 16/08.
    // -----------------------------------------------------------------------
    if (userMessage && jaSeDespediram(historico) && !pareceMensagemDeVerdade(userMessage)) {
      historico.push({ role: 'user', content: userMessage, t: Date.now() });
      await salvarConversa(chave, historico, primeiroNome);
      await salvarLead(chave, { ultima_mensagem_em: agoraIso, despedida_em: agoraIso });
      console.log('[lia] silencio cortes', { chave });
      return res.status(200).json({ ok: true, silencio: 'cortesia' });
    }

    // -----------------------------------------------------------------------
    // POS-VENDA: quem ja e cliente nao pode receber venda. A LIA responde uma
    // linha acolhendo, pausa a conversa e chama os socios.
    // -----------------------------------------------------------------------
    // O estagio conta junto com o eh_cliente pra quando um socio arrastar o card
    // pra Cliente no painel: o kanban so escreve o estagio, e mesmo assim o
    // arrasto tem que calar a venda de verdade.
    const ehClienteAgora = !!lead && (lead.eh_cliente || lead.estagio === 'cliente' || lead.estagio === 'ganho');
    if (ehClienteAgora || (userMessage && cheiroDePosVenda(userMessage))) {
      const aviso = (primeiroNome ? primeiroNome + ' ' : '') + rotuloCliente +
        ' esta falando de pos-venda, nao de compra. Pausei e nao ofereci nada.' +
        (userMessage ? '\nMensagem: "' + String(userMessage).slice(0, 180) + '"' : '') +
        '\nhttps://wa.me/' + rotuloCliente;
      const acolhida = (primeiroNome ? 'Oi, ' + primeiroNome + '! ' : 'Oi! ') +
        'Ja estou chamando o Welber e o Caio aqui pra te atender direitinho nisso. E rapidinho!';
      historico.push({ role: 'user', content: userMessage || '[o cliente enviou uma midia]', t: Date.now() });
      historico.push({ role: 'assistant', content: acolhida, t: Date.now() });
      await salvarConversa(chave, historico, primeiroNome);
      await definirPausaVarios(alvosPausa, true);
      await salvarLead(chave, {
        nome: primeiroNome || null,
        estagio: 'suporte',
        eh_cliente: true,
        ultima_mensagem_em: agoraIso,
      });
      await enviarWhatsapp(chave, acolhida, 3, 0);
      await notificarAdmin('Pos-venda, nao venda: ' + aviso);
      return res.status(200).json({ ok: true, paused: 'pos-venda' });
    }

    // -----------------------------------------------------------------------
    // TRAVA 3: freio de arranque. Se a LIA ja disparou demais nessa conversa,
    // ela para de responder, pausa e passa a bola pros socios.
    // -----------------------------------------------------------------------
    const rajada = estourouRajada(historico);
    if (rajada) {
      await definirPausaVarios(alvosPausa, true);
      historico.push({ role: 'user', content: userMessage || '[o cliente enviou uma imagem]', t: Date.now() });
      await salvarConversa(chave, historico, primeiroNome);
      await notificarAdmin(
        'Pausei sozinha a conversa com ' + (primeiroNome ? primeiroNome + ' ' : '') + rotuloCliente +
        ': ja eram ' + rajada.max + ' respostas minhas em ' + Math.round(rajada.ms / 60000) +
        ' minutos e isso nao parece normal. Melhor um de voces assumir.\nhttps://wa.me/' + rotuloCliente
      );
      return res.status(200).json({ ok: true, paused: 'rajada' });
    }

    // 2. Monta as mensagens pra API e o registro de texto da mensagem do cliente
    let mensagensApi;
    let registroUser;
    if (ehImagem) {
      const legenda = (img.caption || '').trim();
      registroUser = legenda ? `[o cliente enviou uma imagem] ${legenda}` : '[o cliente enviou uma imagem]';
      const base = normalizar(historico).slice(-MAX_HISTORICO_CONTEXTO);
      while (base.length && base[base.length - 1].role === 'user') base.pop();
      mensagensApi = [
        ...base,
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imagemMime, data: imagemBase64 } },
            { type: 'text', text: legenda || 'Imagem enviada pelo cliente.' },
          ],
        },
      ];
    } else {
      registroUser = userMessage;
      mensagensApi = normalizar([...historico, { role: 'user', content: userMessage }]).slice(-MAX_HISTORICO_CONTEXTO);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[zapi-webhook] ANTHROPIC_API_KEY ausente');
      return res.status(500).json({ error: 'api-key-missing' });
    }

    const systemFinal = (primeiroNome
      ? `${SYSTEM_PROMPT}\n\nO nome do cliente com quem voce esta falando agora e: ${primeiroNome}. Use sempre apenas esse primeiro nome.`
      : SYSTEM_PROMPT) + resumoDoLead(lead);

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 700,
        system: systemFinal,
        messages: mensagensApi,
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('[zapi-webhook] Anthropic erro:', anthropicResponse.status, errText);
      return res.status(200).json({ ok: false, error: 'anthropic-error' });
    }

    const data = await anthropicResponse.json();
    const rawReply = data?.content?.[0]?.text || 'Pode repetir, por favor? Acho que me perdi aqui.';

    // 3. Extrai avisos internos e a ficha do CRM, e limpa o texto.
    // Os dois marcadores saem antes do envio: o cliente nunca ve nada disso.
    const { limpo: semAvisos, avisos } = extrairAvisos(rawReply);
    const { limpo, crm } = extrairCrm(semAvisos);
    const reply = sanitizarTexto(limpo) || 'Pode repetir, por favor? Acho que me perdi aqui.';

    // Re-checa a pausa: pode ter sido pausada ENQUANTO a resposta era gerada
    if (await estaPausadaQualquer(alvosPausa)) {
      historico.push({ role: 'user', content: registroUser });
      await salvarConversa(chave, historico, primeiroNome);
      return res.status(200).json({ ok: true, paused: 'late-check' });
    }

    // 4. Salva no historico (imagem vira placeholder de texto).
    // O carimbo t alimenta o freio de arranque da TRAVA 3 e e descartado por
    // normalizar() antes de ir pra API, que so aceita role e content.
    historico.push({ role: 'user', content: registroUser, t: Date.now() });
    historico.push({ role: 'assistant', content: reply, t: Date.now() });
    await salvarConversa(chave, historico, primeiroNome);

    // 4b. Atualiza o CRM com o que ela leu da conversa. Campo que ela nao
    // mandou fica como estava, pra uma resposta distraida nao apagar o que ja
    // estava certo.
    const fichaNova = Object.assign(
      { ultima_mensagem_em: agoraIso },
      primeiroNome ? { nome: primeiroNome } : {},
      lead ? {} : { estagio: 'novo', origem: 'whatsapp' },
      normalizarCrm(crm) || {}
    );
    if (userMessage && ehDespedidaDeLead(userMessage)) fichaNova.despedida_em = agoraIso;
    await salvarLead(chave, fichaNova);

    // 5. Envia UMA mensagem com demora humana
    const { typing, message: dmsg } = delaysHumanos(reply);
    await enviarWhatsapp(chave, reply, typing, dmsg);

    // 6. Notificacoes pro Welber, se houver
    if (avisos.length) {
      const quem = primeiroNome ? primeiroNome + ' (' + rotuloCliente + ')' : rotuloCliente;
      for (const aviso of avisos) {
        await notificarAdmin(aviso + '\nCliente: ' + quem + '\nhttps://wa.me/' + rotuloCliente);
      }
    }

    return res.status(200).json({ ok: true, audio: foiAudio, imagem: ehImagem, typing, avisos: avisos.length });
  } catch (err) {
    console.error('[zapi-webhook] Erro inesperado:', err);
    return res.status(200).json({ ok: false });
  }
};

// Exposto pro cron de follow-up (api/lia-followup.js). Melhor compartilhar do
// que copiar: regra de pausa duplicada e regra que vai divergir.
module.exports.helpers = {
  SYSTEM_PROMPT,
  MODELO,
  SUPABASE_KEY: SUPABASE_ANON,
  NOME_DA_CHAVE,
  canonicalBR,
  primeiroNomeDe,
  delaysHumanos,
  sanitizarTexto,
  extrairAvisos,
  extrairCrm,
  normalizarCrm,
  resumoDoLead,
  expandirIds,
  estaPausadaQualquer,
  definirPausaVarios,
  lerConversa,
  salvarConversa,
  lerLead,
  salvarLead,
  enviarWhatsapp,
  notificarAdmin,
};
