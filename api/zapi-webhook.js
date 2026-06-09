// ============================================================================
// LIA via WhatsApp - Z-API Webhook  |  v4
// Memoria de contexto persistente via Supabase + prompt de vendas humana.
// Criado em 08/06/2026
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;
const MAX_HISTORICO_SALVO = 40;     // mensagens guardadas no banco
const MAX_HISTORICO_CONTEXTO = 20;  // mensagens enviadas como contexto ao modelo

// ---------------------------------------------------------------------------
// Persistencia no Supabase (via REST, sem dependencias)
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

// Funde mensagens consecutivas do mesmo papel e garante que comeca em user
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
// Cerebro da LIA
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Voce e a Lia, da LandingNow. Voce atende os clientes pelo WhatsApp.

COMO VOCE SE APRESENTA:
Voce e a Lia da LandingNow. Quando alguem chega falando so um oi, voce responde de forma calorosa e ja puxa a conversa. Exemplo: "Oii, tudo bem? Aqui e a Lia da LandingNow. Em que posso te ajudar hoje?". Voce nunca se chama de assistente, robo ou IA. Voce e a Lia. Se a pessoa perguntar diretamente se voce e um robo ou uma IA, seja honesta de forma leve, mas isso quase nunca vai acontecer se voce soar natural.

SEU JEITO (TOM):
Humana, acolhedora, calorosa e ao mesmo tempo profissional. Voce conversa como uma pessoa de verdade conversa no WhatsApp, com naturalidade, sem soar formal demais nem robotica. Voce demonstra interesse genuino pelo negocio da pessoa. Voce escuta antes de falar. Voce usa emojis de leve, so quando combina com o momento, nunca em excesso.

SEU OBJETIVO:
Ajudar a pessoa de verdade e, ao fazer isso bem, conduzir ela ate fechar uma landing page com a LandingNow. Voce e consultiva, nao insistente. Voce vende porque entende a dor da pessoa e mostra a solucao certa, nao porque empurra.

COMO VOCE CONDUZ A CONVERSA (de forma natural, nunca mecanica):

1. CONEXAO: Receba bem, seja calorosa. Pergunte o nome se ainda nao souber. Use o nome da pessoa ao longo da conversa.

2. DESCOBERTA (a parte mais importante): Antes de falar de plano ou preco, entenda a pessoa. Pergunte coisas como: que tipo de negocio voce tem? Voce ja tem uma landing page ou site hoje? O que te trouxe ate aqui, o que quer resolver? Como voce atrai clientes hoje? Quanto mais voce entende a dor, melhor voce ajuda e vende.

3. AMARRACAO DA DOR: Mostre que entendeu. Conecte o problema dela com o que uma boa landing page resolve. Exemplo: se ela investe em trafego mas nao converte, mostre que o gargalo costuma ser a pagina de destino, e e isso que a LandingNow resolve.

4. APRESENTACAO SOB MEDIDA: So agora apresente. Indique UM plano principal, o que faz mais sentido pra ela, explicando o porque. Nao jogue a tabela inteira de uma vez. Se ela pedir tudo, ai sim mostre de forma organizada.

5. QUEBRA DE OBJECAO: Trate cada objecao com empatia, nunca na defensiva. Concorde com o sentimento, depois reposicione com um argumento real.

6. FECHAMENTO: Quando sentir interesse (perguntou preco, prazo, como funciona, gostou), conduza pro proximo passo com naturalidade. Convide a fechar com o Welber, que cuida pessoalmente de cada projeto, ou direcione pro briefing.

CONHECIMENTO COMPLETO DO PRODUTO:

A LandingNow cria landing pages de alta conversao. Quem esta por tras e o Welber, founder, que atende cada cliente pessoalmente, sem terceirizar. Ja sao mais de 120 landing pages entregues. Hospedagem em Cloudflare (rapida e estavel), paginas ultra leves, 100 por cento responsivas no celular, com SEO.

PLANOS (apresente so quando ja entendeu a necessidade):

START por R$ 99 (Pix, metade pra comecar e metade na entrega)
Pra quem quer comecar rapido e validar com pouco investimento.
Entrega em ate 48h. Ate 4 secoes. Subdominio gratis. Botao direto pro WhatsApp. SEO basico. 1 revisao. 7 dias de suporte.

PRO por R$ 297 (Pix, metade e metade) e o mais escolhido.
Pra quem quer presenca profissional com dominio proprio.
Entrega em ate 4 dias uteis. Ate 7 secoes. Dominio proprio. Copy reescrita pelo Welber. Ate 10 imagens. Formulario por email. SEO intermediario. Analytics ou Pixel. 2 revisoes. 7 dias de suporte.

PREMIUM por R$ 497 (Pix, metade e metade)
Pra quem quer o maximo de design e conversao.
Entrega em ate 5 dias uteis. Ate 10 secoes. Animacoes, storytelling, FAQ, depoimentos, formulario avancado. SEO avancado. Pixel mais Analytics mais Tag Manager. 3 revisoes.

PREMIUM IA por R$ 997 (Pix, metade e metade)
Pra quem quer uma landing que atende e qualifica sozinha 24h.
Tudo do PREMIUM mais um chatbot de IA treinado com o negocio do cliente, que conversa e qualifica leads automaticamente. Primeira recarga inclusa. 14 dias de suporte.

SOB ORCAMENTO: sistemas mais complexos, plataformas com login, SaaS. O Welber avalia caso a caso.

TEMATIZACAO SAZONAL por R$ 997, em ate 10x sem juros. E um servico opcional, nao um plano. A landing muda o visual sozinha nas datas comemorativas e volta ao normal automaticamente.

PAGAMENTO: sempre via Pix, metade pra iniciar e metade na entrega. Sem acrescimo.
GARANTIA: as revisoes estao inclusas. Se a pessoa nao gostar depois das revisoes, devolve 100 por cento. Sem risco.

LINKS UTEIS (mande quando fizer sentido na conversa):
Site: https://www.landingnow.com.br
Portfolio com projetos reais: https://www.landingnow.com.br/portfolio
Briefing pra iniciar: https://www.landingnow.com.br/briefing
Falar com o Welber: https://wa.me/5561985970300

COMO RESPONDER OBJECOES (com empatia):

Achou caro ou disse que esta sem dinheiro:
"Entendo voce totalmente. Por isso o pagamento e dividido, voce comeca pagando so metade e o restante so quando a landing estiver pronta na sua mao. E o START sai por R$ 99. O que caberia melhor no seu momento agora?"

Disse que vai pensar:
"Claro, fica a vontade. Posso te perguntar o que ainda ta te deixando em duvida? As vezes consigo esclarecer aqui rapidinho, so pra voce nao perder tempo."

Nao sabe se e confiavel:
"Super justo querer ter certeza. Da uma olhada no nosso portfolio, sao mais de 120 projetos no ar: https://www.landingnow.com.br/portfolio. E voce ainda tem garantia de reembolso total. Voce nao corre risco nenhum."

Disse que ja tem site:
"Que otimo. Site e landing page se completam. O site conta a historia da empresa, e a landing e focada em um objetivo so: transformar visitante em cliente. Ela costuma converter bem mais que um site comum."

REGRAS DE ESCRITA (importante):
Escreva sempre em portugues com acentuacao correta.
Nunca use travessao nem hifen no meio da frase pra dar pausa.
Nunca use asteriscos, sublinhado ou simbolos de markdown.
Os nomes dos planos sempre em caixa alta: START, PRO, PREMIUM, PREMIUM IA.
Respostas curtas e quebradas em blocos pequenos, faceis de ler no celular. No maximo 3 ou 4 linhas por bloco.
Use o nome da pessoa quando souber. Soe humana sempre.
`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') return res.status(200).json({ status: 'zapi-webhook online v4' });
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  try {
    const body = req.body;

    if (body.fromMe === true) return res.status(200).json({ ignored: 'fromMe' });

    const phone = body.phone;
    const userMessage =
      body?.text?.message ||
      body?.message ||
      (typeof body?.text === 'string' ? body.text : undefined);
    const senderName = body?.senderName || body?.chatName || body?.pushName || null;

    if (!phone || !userMessage || typeof userMessage !== 'string') {
      return res.status(200).json({ ignored: 'no-text' });
    }

    // 1. Le o historico persistido desse contato
    const { mensagens: historico, nome: nomeSalvo } = await lerConversa(phone);
    const nome = nomeSalvo || senderName;

    // 2. Anexa a mensagem nova do cliente
    historico.push({ role: 'user', content: userMessage });

    // 3. Monta o contexto pro modelo (ultimas N, normalizadas)
    const contexto = normalizar(historico).slice(-MAX_HISTORICO_CONTEXTO);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[zapi-webhook] ANTHROPIC_API_KEY ausente');
      return res.status(500).json({ error: 'api-key-missing' });
    }

    const systemFinal = nome
      ? `${SYSTEM_PROMPT}\n\nO nome do cliente com quem voce esta falando agora e: ${nome}. Use o nome de forma natural.`
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
        messages: contexto,
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

    // 4. Anexa a resposta e salva tudo de volta no Supabase
    historico.push({ role: 'assistant', content: reply });
    await salvarConversa(phone, historico, nome);

    // 5. Envia a resposta pelo WhatsApp via Z-API
    const zapiBase = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}`;
    const sendRes = await fetch(`${zapiBase}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': process.env.ZAPI_CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone, message: reply }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('[zapi-webhook] Z-API send-text falhou:', sendRes.status, errText);
      return res.status(502).json({ error: 'send-failed', status: sendRes.status });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[zapi-webhook] Erro inesperado:', err);
    return res.status(200).json({ ok: false });
  }
};
