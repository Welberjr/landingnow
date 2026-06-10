// ============================================================================
// LIA via WhatsApp - Z-API Webhook  |  v13
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
// Atualizado em 09/06/2026
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MAX_HISTORICO_SALVO = 40;
const MAX_HISTORICO_CONTEXTO = 20;
const MAX_IMAGEM_BYTES = 4500000; // ~4.5MB (limite seguro pra API)

// WhatsApp pessoal do Welber (canal de comando e notificacoes)
const ADMIN_PHONE = '5561982920444';
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
async function estaPausada(phone) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return false;
  try {
    const url = `${SUPABASE_URL}/rest/v1/lia_conversas?phone=eq.${encodeURIComponent('ctrl:' + phone)}&select=nome_cliente`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!r.ok) return false;
    const data = await r.json();
    return Array.isArray(data) && data.length > 0 && data[0].nome_cliente === 'paused';
  } catch (e) {
    console.error('[pausa] erro ao consultar:', e);
    return false;
  }
}

async function definirPausa(phone, pausada) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    const body = JSON.stringify({
      phone: 'ctrl:' + phone,
      mensagens: [],
      nome_cliente: pausada ? 'paused' : 'active',
      total_mensagens: 0,
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
    if (!r.ok) console.error('[pausa] salvar falhou:', r.status, await r.text());
  } catch (e) {
    console.error('[pausa] erro ao salvar:', e);
  }
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

async function notificarAdmin(texto) {
  return enviarWhatsapp(ADMIN_PHONE, texto, 2, 0);
}

// ---------------------------------------------------------------------------
// Comandos do Welber pelo WhatsApp pessoal (ADMIN_PHONE)
// ---------------------------------------------------------------------------
function extrairNumeroComando(texto) {
  const bruto = ((texto || '').match(/\d[\d\s.\-()]{7,}/) || [''])[0].replace(/\D/g, '');
  if (!bruto) return null;
  if (bruto.length === 10 || bruto.length === 11) return '55' + bruto;
  if (bruto.length >= 12) return bruto;
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
  if (/\bstatus\b/.test(t)) {
    const lista = await listarPausadas();
    if (!lista.length) return 'Nenhuma conversa pausada. Estou atendendo todo mundo.';
    return 'Conversas pausadas (' + lista.length + '):\n' + lista.join('\n') + '\n\nPra liberar: voltar NUMERO';
  }
  return 'Oi Welber! Comandos que eu entendo aqui:\nvoltar NUMERO (volto a atender)\npausar NUMERO (fico em silencio)\nstatus (lista de pausadas)';
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

DETECCAO DE INTENCAO (a regra mais importante de todas):
Antes de cada resposta, identifique em qual momento o cliente esta:
MODO EXPLORANDO: o cliente esta conhecendo, com duvidas, pesquisando. Aqui voce e consultiva: escuta, faz no maximo uma pergunta por vez, entende o negocio dele, mostra o portfolio ou um exemplo, recomenda o plano certo.
MODO DECIDIDO: o cliente deu sinal de compra. Sinais: "quero fechar", "vamos fazer", "como pago", "me manda o pix", "pode comecar", "fechado", "quero o plano X", "manda o link", "vou querer". A partir desse sinal, MODO FECHAMENTO IMEDIATO:
1. Se ainda nao estiver claro qual plano, confirme em UMA linha (ex: "Perfeito! Fechamos no PRO de R$ 297 entao?").
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
4. Quando fizer sentido, sugere o plano que mais combina e explica curto o porque.
5. Tira todas as duvidas com paciencia. Se a pessoa quer ver o briefing, mostra. Se quer ver o portfolio, manda.
6. Fala de pagamento quando a pessoa perguntar ou quando ela der sinal de compra. Dai entra o MODO FECHAMENTO.

CONHECIMENTO DO PRODUTO:
A LandingNow cria landing pages de alta conversao. Quem esta por tras e o Welber, founder, que atende cada cliente pessoalmente, sem terceirizar. Mais de 120 landing pages entregues. Hospedagem em Cloudflare inclusa, paginas leves, 100 por cento responsivas no celular, com SEO.

PLANOS (apresente so quando ja entendeu a necessidade, e um de cada vez):
START por R$ 99. Pra comecar rapido e validar. Entrega em ate 48h. Ate 4 secoes. Subdominio gratis (cliente.landingnow.com.br). Botao pro WhatsApp. SEO basico. 1 revisao.
PRO por R$ 297. O mais escolhido. Presenca profissional com dominio proprio configurado. Ate 4 dias uteis. Ate 7 secoes. Copy persuasiva reescrita pelo Welber. Ate 10 imagens. Formulario por email. SEO intermediario. Analytics ou Pixel instalado. 2 revisoes.
PREMIUM por R$ 497. Maximo de design e conversao. Ate 5 dias uteis. Ate 10 secoes. Animacoes, storytelling, FAQ, depoimentos. SEO avancado. Pixel, Analytics e Tag Manager. 3 revisoes.
PREMIUM IA por R$ 997. Uma landing que atende e qualifica sozinha 24h. Tudo do PREMIUM mais um chatbot de IA treinado com o negocio do cliente, que qualifica os leads antes de mandar pro WhatsApp. Primeira recarga de creditos inclusa. Entrega em ate 7 dias uteis. 3 revisoes. Suporte estendido de 14 dias.
SOB ORCAMENTO: sistemas mais complexos, plataformas com login, area de membros, e-commerce, SaaS, sites de varias paginas.
TEMATIZACAO SAZONAL por R$ 997. Servico opcional, nao e plano. A landing muda o visual sozinha nas datas comemorativas (Natal, Black Friday, festa junina e outras) e volta ao normal depois.

DETALHES QUE VOCE SABE (use quando perguntarem, sem despejar tudo de uma vez):
O prazo de entrega comeca a contar quando a entrada esta paga E o briefing esta completo com os materiais.
Criacao de logo e identidade visual nao esta inclusa em nenhum plano. Se o cliente nao tiver, o Welber usa o criterio profissional dele pra deixar bonito e alinhado ao segmento.
Dominio proprio (planos PRO pra cima): o Welber configura tudo, mas o registro do dominio e feito no nome do proprio cliente no Registro.br, custa em torno de R$ 50 por ano, pago direto pelo cliente. Isso protege o cliente, o dominio fica sendo dele de verdade.
Toda landing entregue tem 7 dias de suporte gratuito pra qualquer correcao tecnica (14 dias no PREMIUM IA).
Revisoes sao ajustes durante a producao (trocar textos, cores, imagens, espacamentos). Coisas grandes como adicionar uma secao nova inteira tem custo a parte (R$ 97 durante a producao). Depois da entrega final, ajustes avulsos custam a partir de R$ 49, ou o cliente pode contratar manutencao mensal (R$ 49 por mes com 2 ajustes, ou R$ 197 por mes com ajustes pontuais ilimitados).
No PREMIUM IA, a conta da IA fica no nome do cliente. A primeira recarga (mais ou menos R$ 30, que rende de 500 a 1000 conversas) ja esta inclusa. A partir do segundo mes o cliente recarrega quando precisar, e recebe um tutorial simples de como fazer.

O BRIEFING:
O briefing e um formulario rapido onde o cliente preenche as informacoes que a gente precisa pra criar a landing dele (sobre o negocio, publico, textos, fotos, identidade visual e objetivo). Link: https://www.landingnow.com.br/briefing.
O fluxo padrao e: fechou e pagou a entrada, voce manda o briefing pra ele preencher e avisa que o prazo comeca assim que ele enviar tudo.
Mas se o cliente pedir pra ver o briefing antes de pagar, sem problema nenhum: explique em uma linha o que ele vai precisar (dados do negocio, cliente ideal, fotos) e mande o link pra ele conhecer, sem cobrar nada nesse momento.
Se ele responder qualquer pergunta do briefing com faca o que achar melhor, isso vira carta branca pro Welber decidir com o criterio profissional dele.

FORMAS DE PAGAMENTO (no modo fechamento, ou quando o cliente perguntar):
Existem duas formas, e voce apresenta as duas com leveza, deixando o cliente escolher:
1. Pix: dividido em duas partes iguais, sem juros. Metade de entrada pra dar inicio, e a outra metade so na entrega, depois que o cliente ver a landing pronta e aprovar. Chave Pix: contato@landingnow.com.br (tipo email), em nome de Welber Moreira de Azevedo Junior, no Nubank. Valores de entrada: START R$ 49,50, PRO R$ 148,50, PREMIUM R$ 248,50, PREMIUM IA R$ 498,50.
2. Cartao de credito: ate 12x, por link seguro, com o valor total do plano. Links por plano:
START: https://link.infinitepay.io/welberjunior/VC1DLTAtUg-eeDhq1UeoL-99,90
PRO: https://link.infinitepay.io/welberjunior/VC1DLTAtUg-7TtZcGpZPb-297,00
PREMIUM: https://link.infinitepay.io/welberjunior/VC1DLTAtUg-yMiZNnKmzE-497,00
PREMIUM IA: https://link.infinitepay.io/welberjunior/VC1DLTAtUg-4CTSI1agri-997,00
Regras importantes do pagamento:
Depois que voce ja passou a chave Pix ou o link nessa conversa, NAO repita os dados por conta propria. So envie de novo se o cliente pedir.
Sobre juros do cartao: nao toque nesse assunto por conta propria. So se o cliente perguntar, ai explique com leveza que sem juros e somente no Pix, e que no cartao o parcelamento fica por conta da operadora.

DESCONTO:
Se o cliente pedir desconto, explique com gentileza e firmeza que o valor da LandingNow ja e bem abaixo do mercado pra mesma qualidade ou ate superior. Tem gente cobrando R$ 1.000, R$ 2.000 ou R$ 3.000 por uma landing, e a LandingNow entrega qualidade igual ou melhor por bem menos, e e justamente por isso que nao da pra reduzir o preco.
Unica excecao: se o cliente fechar 2 ou mais landing pages de uma vez, todas dos planos PREMIUM (R$ 497) ou PREMIUM IA (R$ 997), no mesmo dia e com o pagamento efetuado, ele ganha 10 por cento de desconto em cada uma. Precisa ser no mesmo dia e pago. Nao vale fechar uma hoje e outra outro dia.

QUANDO O CLIENTE ENVIA UMA IMAGEM:
Olhe a imagem com atencao antes de responder.
Se for um comprovante de pagamento (Pix, transferencia, print de banco com valor, horario e nome), agradeca de forma calorosa, diga que recebeu e que o Welber vai conferir, e ja mande o briefing se ele ainda nao preencheu: https://www.landingnow.com.br/briefing. Nunca afirme de forma absoluta que o pagamento ja esta confirmado, porque quem confere na conta e o Welber. Use algo como "recebi seu comprovante, muito obrigada" em vez de "pagamento confirmado".
Se for outra imagem (foto de produto, print de duvida, logotipo, referencia visual), responda normalmente, ajudando com o que a pessoa precisa.

QUANDO VOCE NAO SABE OU O PEDIDO FOGE DO ESCOPO:
Se o cliente pedir algo que voce nao tem certeza se a LandingNow faz, ou algo fora dos planos (sistema completo, plataforma com login, e-commerce, app, integracao especifica, site de varias paginas, qualquer coisa que voce nao saiba responder com seguranca), NUNCA invente e NUNCA prometa. Responda assim, com naturalidade: diga que esse e um caso que voce vai precisar verificar com o Welber, que ele esta em reuniao nesse momento, e que assim que ele sair voce traz o retorno certinho, ou pede pra ele mesmo entrar em contato. Isso passa a imagem real: o Welber e ocupado e o atendimento e serio.

AVISOS INTERNOS PRO WELBER (regra tecnica, siga a risca):
Existe um canal interno que avisa o Welber no celular dele. Para usar, escreva em uma linha separada, no FINAL da sua resposta, o marcador exato:
[[AVISAR_WELBER: texto curto do aviso]]
O cliente NUNCA ve esse marcador, ele e removido antes do envio. Use o marcador SOMENTE nestes casos:
1. Cliente enviou comprovante de pagamento: [[AVISAR_WELBER: Fechou! Cliente NOME enviou comprovante do plano X (valor). Conferir o pagamento e o briefing.]]
2. Cliente afirmou que pagou (mesmo sem comprovante ainda): [[AVISAR_WELBER: Cliente NOME disse que fez o pagamento do plano X. Aguardando comprovante.]]
3. Duvida que voce ficou de verificar com o Welber: [[AVISAR_WELBER: Cliente NOME perguntou X. Falei que voce esta em reuniao e retorna.]]
4. Cliente pediu expressamente falar com o responsavel: [[AVISAR_WELBER: Cliente NOME pediu pra falar com voce.]]
Fora desses casos, NAO use o marcador. Nunca mencione ao cliente que existe esse canal interno, nem sistema de avisos, nem comandos.

OBJECOES (responda curto, com empatia, sem ficar na defensiva):
Achou caro: lembre com gentileza que a qualidade e de quem cobra muito mais, que da pra dividir no Pix (metade so na entrega apos aprovacao) ou parcelar no cartao em ate 12x, e que tem garantia de reembolso. Pergunte o que cabe melhor pra ela.
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

  if (req.method === 'GET') return res.status(200).json({ status: 'zapi-webhook online v13' });
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  try {
    const body = req.body;
    const messageId = body.messageId || body.id;
    const phone = body.phone;
    const senderName = body?.senderName || body?.chatName || body?.pushName || null;

    // -----------------------------------------------------------------------
    // Mensagens enviadas PELO NUMERO da LandingNow (fromMe)
    // Pode ser: eco da propria LIA (ignorar) ou o WELBER respondendo
    // manualmente (pausar a conversa e avisar o Welber no pessoal).
    // -----------------------------------------------------------------------
    console.log("[fromMe-debug]", JSON.stringify({fromMe:body.fromMe,messageId:body.messageId,id:body.id,zaapId:body.zaapId,phone:body.phone,type:body.type,keys:Object.keys(body||{}).slice(0,20)}));
    if (body.fromMe === true) {
      // Eco de mensagem que a propria LIA enviou
      if (messageId && (await jaRegistrada(messageId))) {
        return res.status(200).json({ ignored: 'eco-lia' });
      }
      // Mensagens do numero comercial pro chat do admin = notificacoes da LIA
      if (!phone || phone === ADMIN_PHONE) {
        return res.status(200).json({ ignored: 'fromMe-admin' });
      }

      const textoManual =
        body?.text?.message ||
        body?.message ||
        (typeof body?.text === 'string' ? body.text : null);

      const { mensagens: hist, nome } = await lerConversa(phone);

      // Fallback anti-eco: texto identico a ultima resposta da LIA
      const ultimaLia = [...hist].reverse().find((m) => m && m.role === 'assistant');
      if (textoManual && ultimaLia && ultimaLia.content === textoManual) {
        return res.status(200).json({ ignored: 'eco-lia-texto' });
      }

      const jaEstavaPausada = await estaPausada(phone);
      if (!jaEstavaPausada) {
        await definirPausa(phone, true);
        const quem = primeiroNomeDe(nome) ? primeiroNomeDe(nome) + ' (' + phone + ')' : phone;
        await notificarAdmin(
          'Voce assumiu a conversa com ' + quem + '. Fiquei em silencio nesse chat.\n' +
          'Pra eu voltar a atender, responda aqui: voltar ' + phone
        );
      }

      // Guarda o que o Welber falou, pra LIA voltar com contexto
      if (textoManual) {
        hist.push({ role: 'assistant', content: textoManual });
        await salvarConversa(phone, hist, nome);
      }
      return res.status(200).json({ ok: true, paused: true });
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

    // --- Audio ---
    let foiAudio = false;
    if (!userMessage && body?.audio && body.audio.audioUrl) {
      foiAudio = true;
      userMessage = await transcreverAudio(body.audio.audioUrl, body.audio.mimeType);
    }

    // -----------------------------------------------------------------------
    // Canal de comando: mensagens vindas do WhatsApp pessoal do Welber
    // -----------------------------------------------------------------------
    if (phone === ADMIN_PHONE) {
      const resposta = await tratarComandoAdmin(userMessage || '');
      await enviarWhatsapp(ADMIN_PHONE, resposta, 2, 0);
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
    if (phone && (await estaPausada(phone))) {
      const { mensagens: hist, nome } = await lerConversa(phone);
      const registro = userMessage
        ? userMessage
        : (foiImagem ? '[o cliente enviou uma imagem]' : (foiAudio ? '[o cliente enviou um audio]' : null));
      if (registro) {
        hist.push({ role: 'user', content: registro });
        await salvarConversa(phone, hist, primeiroNomeDe(nome || senderName));
      }
      return res.status(200).json({ ok: true, paused: true, silent: true });
    }

    // Audio que nao deu pra transcrever
    if (foiAudio && !userMessage) {
      if (phone) {
        await enviarWhatsapp(phone, 'Oi! Nao consegui ouvir direito seu audio agora. Pode mandar de novo ou, se preferir, me escrever por aqui?', 4);
      }
      return res.status(200).json({ ok: true, note: 'audio-nao-transcrito' });
    }

    // Imagem que nao deu pra baixar
    if (foiImagem && !imagemBase64) {
      if (phone) {
        await enviarWhatsapp(phone, 'Oi! Recebi sua imagem mas nao consegui abrir ela aqui. Pode mandar de novo, por favor?', 4);
      }
      return res.status(200).json({ ok: true, note: 'imagem-nao-carregada' });
    }

    const ehImagem = foiImagem && !!imagemBase64;

    if (!phone || (!ehImagem && (!userMessage || typeof userMessage !== 'string'))) {
      return res.status(200).json({ ignored: 'no-content' });
    }

    // 1. Le o historico persistido
    const { mensagens: historico, nome: nomeSalvo } = await lerConversa(phone);
    const primeiroNome = primeiroNomeDe(nomeSalvo || senderName);

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

    const systemFinal = primeiroNome
      ? `${SYSTEM_PROMPT}\n\nO nome do cliente com quem voce esta falando agora e: ${primeiroNome}. Use sempre apenas esse primeiro nome.`
      : SYSTEM_PROMPT;

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

    // 3. Extrai avisos internos pro Welber e limpa o texto
    const { limpo, avisos } = extrairAvisos(rawReply);
    const reply = sanitizarTexto(limpo) || 'Pode repetir, por favor? Acho que me perdi aqui.';

    // 4. Salva no historico (imagem vira placeholder de texto)
    historico.push({ role: 'user', content: registroUser });
    historico.push({ role: 'assistant', content: reply });
    await salvarConversa(phone, historico, primeiroNome);

    // 5. Envia UMA mensagem com demora humana
    const { typing, message: dmsg } = delaysHumanos(reply);
    await enviarWhatsapp(phone, reply, typing, dmsg);

    // 6. Notificacoes pro Welber, se houver
    if (avisos.length) {
      const quem = primeiroNome ? primeiroNome + ' (' + phone + ')' : phone;
      for (const aviso of avisos) {
        await notificarAdmin(aviso + '\nCliente: ' + quem + '\nhttps://wa.me/' + phone);
      }
    }

    return res.status(200).json({ ok: true, audio: foiAudio, imagem: ehImagem, typing, avisos: avisos.length });
  } catch (err) {
    console.error('[zapi-webhook] Erro inesperado:', err);
    return res.status(200).json({ ok: false });
  }
};
