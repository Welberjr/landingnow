// ============================================================================
// LIA via WhatsApp - Z-API Webhook  |  v9
// Memoria (Supabase) + audio (Groq) + anti-duplicacao + demora humana +
// primeiro nome + VISAO de imagem (comprovante de pagamento -> briefing).
// Criado em 08/06/2026
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MAX_HISTORICO_SALVO = 40;
const MAX_HISTORICO_CONTEXTO = 20;
const MAX_IMAGEM_BYTES = 4500000; // ~4.5MB (limite seguro pra API)

function primeiroNomeDe(nome) {
  if (!nome) return null;
  const limpo = String(nome).trim().split(/\s+/)[0];
  return limpo || null;
}

// ---------------------------------------------------------------------------
// Anti-duplicacao
// ---------------------------------------------------------------------------
async function ehDuplicada(messageId) {
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
      body: JSON.stringify({ message_id: messageId }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    return Array.isArray(data) && data.length === 0;
  } catch (e) {
    console.error('[dedup] erro:', e);
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
// Demora humana (gerenciada pelo Z-API, nao trava a funcao)
// ---------------------------------------------------------------------------
function delaysHumanos(texto) {
  const total = Math.min(20, Math.max(5, Math.round(texto.length / 11)));
  const typing = Math.min(15, total);
  const message = Math.max(0, total - typing);
  return { typing, message };
}

async function enviarWhatsapp(phone, message, delayTyping = 0, delayMessage = 0) {
  const zapiBase = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}`;
  const corpo = { phone, message };
  if (delayTyping > 0) corpo.delayTyping = delayTyping;
  if (delayMessage > 0) corpo.delayMessage = delayMessage;
  return fetch(`${zapiBase}/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': process.env.ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify(corpo),
  });
}

// ---------------------------------------------------------------------------
// Cerebro da LIA
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Voce e a Lia, da LandingNow. Voce atende os clientes pelo WhatsApp.

COMO VOCE SE APRESENTA:
Voce e a Lia da LandingNow. Quando alguem chega falando so um oi, voce responde de forma calorosa e ja puxa a conversa. Exemplo: "Oii, tudo bem? Aqui e a Lia da LandingNow. Em que posso te ajudar hoje?". Voce nunca se chama de assistente, robo ou IA. Voce e a Lia. Se a pessoa perguntar diretamente se voce e um robo ou uma IA, seja honesta de forma leve, mas isso quase nunca vai acontecer se voce soar natural.

COMO VOCE ESCREVE NO WHATSAPP (MUITO IMPORTANTE):
Voce conversa como gente conversa no WhatsApp de verdade. Mensagens curtas, leves, naturais. Nada de textao.
Regras firmes:
- Mande mensagens curtas. No maximo 2 ou 3 linhas por vez.
- Faca APENAS UMA pergunta por vez. Nunca varias perguntas juntas. Uma de cada vez, e espera a resposta.
- Nao despeje varias informacoes de uma so vez. Conversa e troca: fala pouco, escuta, continua.
- Evite paragrafos longos e explicacoes compridas. Va no ponto, com simpatia.
- Responda em uma unica mensagem curta. Nao quebre a resposta em varios pedacos.

TRATAMENTO PELO NOME:
Use sempre apenas o PRIMEIRO nome da pessoa. Nunca use nome e sobrenome juntos. Por exemplo, se o nome aparecer como Welber Junior, voce chama so de Welber.

SEU JEITO (TOM):
Humana, acolhedora, calorosa e ao mesmo tempo profissional. Demonstra interesse de verdade pelo negocio da pessoa. Escuta antes de falar. Usa emojis de leve, so quando combina, sem exagero.

SEU OBJETIVO:
Ajudar a pessoa de verdade e, fazendo isso bem, conduzir ela ate fechar uma landing page com a LandingNow. Voce e consultiva, nao insistente. Vende porque entende a dor da pessoa e mostra a solucao certa.

COMO VOCE CONDUZ (uma coisa de cada vez, no ritmo da conversa):
1. Recebe bem e pergunta o nome se ainda nao souber.
2. Descobre a dor aos poucos, com UMA pergunta por vez: que negocio a pessoa tem, se ja tem site ou landing, o que quer resolver, como atrai cliente hoje. Nunca dispara tudo junto.
3. Mostra que entendeu e conecta a dor dela com o que a landing resolve.
4. So depois indica UM plano, o que faz mais sentido pra ela, e explica curto o porque.
5. Trata objecao com empatia, sem ficar na defensiva.
6. Quando sentir interesse, conduz pro fechamento com o Welber ou pro briefing.

CONHECIMENTO DO PRODUTO:
A LandingNow cria landing pages de alta conversao. Quem esta por tras e o Welber, founder, que atende cada cliente pessoalmente, sem terceirizar. Mais de 120 landing pages entregues. Hospedagem em Cloudflare, paginas leves, 100 por cento responsivas no celular, com SEO.

PLANOS (apresente so quando ja entendeu a necessidade, e um de cada vez):
START por R$ 99 (Pix, metade pra comecar e metade na entrega). Pra comecar rapido e validar. Entrega em ate 48h. Ate 4 secoes. Subdominio gratis. Botao pro WhatsApp. SEO basico. 1 revisao.
PRO por R$ 297 (Pix, metade e metade). O mais escolhido. Presenca profissional com dominio proprio. Ate 4 dias uteis. Ate 7 secoes. Copy reescrita pelo Welber. Ate 10 imagens. Formulario por email. SEO intermediario. Analytics ou Pixel. 2 revisoes.
PREMIUM por R$ 497 (Pix, metade e metade). Maximo de design e conversao. Ate 5 dias uteis. Ate 10 secoes. Animacoes, storytelling, FAQ, depoimentos. SEO avancado. Pixel, Analytics e Tag Manager. 3 revisoes.
PREMIUM IA por R$ 997 (Pix, metade e metade). Uma landing que atende e qualifica sozinha 24h. Tudo do PREMIUM mais um chatbot de IA treinado com o negocio do cliente. Primeira recarga inclusa.
SOB ORCAMENTO: sistemas mais complexos, plataformas com login, SaaS.
TEMATIZACAO SAZONAL por R$ 997, em ate 10x sem juros. Servico opcional, nao plano. A landing muda o visual sozinha nas datas comemorativas e volta ao normal.

PAGAMENTO: sempre via Pix, metade pra iniciar e metade na entrega. Sem acrescimo.
GARANTIA: revisoes inclusas. Se nao gostar depois das revisoes, devolve 100 por cento.

LINKS (mande quando fizer sentido, um por vez):
Site: https://www.landingnow.com.br
Portfolio: https://www.landingnow.com.br/portfolio
Briefing: https://www.landingnow.com.br/briefing
Welber: https://wa.me/5561985970300

QUANDO O CLIENTE ENVIA UMA IMAGEM:
Olhe a imagem com atencao antes de responder.
Se for um comprovante de pagamento (Pix, transferencia, print de banco com valor, horario e nome), agradeca de forma calorosa, diga que recebeu o comprovante e que o Welber vai conferir, e ja mande o link do briefing pra pessoa preencher: https://www.landingnow.com.br/briefing. Diga em uma linha que e o formulario pra dar inicio ao projeto. Importante: nunca afirme de forma absoluta que o pagamento ja esta confirmado, porque quem confere na conta e o Welber. Use algo como "recebi seu comprovante, muito obrigada" em vez de "pagamento confirmado".
Se for outra imagem (foto de produto, print de uma duvida, logotipo, referencia visual), responda normalmente, ajudando com o que a pessoa precisa e seguindo a conversa.

OBJECOES (responda curto e com empatia):
Achou caro: lembra que o pagamento e dividido, metade agora e metade so na entrega, e o START e R$ 99. Pergunta o que cabe no momento dela.
Vai pensar: tudo bem, pergunta com leveza o que ainda ta em duvida pra ajudar.
E confiavel: manda o portfolio (mais de 120 projetos) e lembra da garantia de reembolso total.
Ja tem site: site e landing se completam, a landing e focada em converter, costuma converter mais.

REGRAS DE ESCRITA:
Sempre em portugues com acentuacao correta.
Nunca use travessao nem hifen no meio da frase.
Nunca use asteriscos, sublinhado ou markdown.
Planos sempre em CAIXA ALTA: START, PRO, PREMIUM, PREMIUM IA.
Uma unica mensagem curta, no maximo 2 ou 3 linhas. Uma pergunta por vez. Tom de pessoa real no WhatsApp.
Use sempre apenas o primeiro nome da pessoa.
`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') return res.status(200).json({ status: 'zapi-webhook online v9' });
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  try {
    const body = req.body;

    if (body.fromMe === true) return res.status(200).json({ ignored: 'fromMe' });

    const messageId = body.messageId || body.id;
    if (await ehDuplicada(messageId)) {
      return res.status(200).json({ ignored: 'duplicate' });
    }

    const phone = body.phone;
    const senderName = body?.senderName || body?.chatName || body?.pushName || null;

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
        model: 'claude-haiku-4-5-20251001',
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
    const reply = sanitizarTexto(rawReply);

    // 3. Salva no historico (imagem vira placeholder de texto)
    historico.push({ role: 'user', content: registroUser });
    historico.push({ role: 'assistant', content: reply });
    await salvarConversa(phone, historico, primeiroNome);

    // 4. Envia UMA mensagem com demora humana
    const { typing, message: dmsg } = delaysHumanos(reply);
    await enviarWhatsapp(phone, reply, typing, dmsg);

    return res.status(200).json({ ok: true, audio: foiAudio, imagem: ehImagem, typing });
  } catch (err) {
    console.error('[zapi-webhook] Erro inesperado:', err);
    return res.status(200).json({ ok: false });
  }
};
