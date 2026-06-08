// ============================================================================
// LIA via WhatsApp - Z-API Webhook
// Vercel Serverless Function (CommonJS)
// Recebe mensagens do Z-API, processa com a LIA e devolve resposta via Z-API.
// Criado em 08/06/2026
// ============================================================================

const conversationHistory = new Map();
const MAX_HISTORY = 16;

function getHistory(phone) {
  return conversationHistory.get(phone) || [];
}

function addToHistory(phone, role, content) {
  const history = getHistory(phone);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  conversationHistory.set(phone, history);
}

function sanitizarTexto(texto) {
  if (!texto) return texto;
  return texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s*[---]\s*/g, ', ')
    .replace(/^\s*-\s+/gm, '')
    .replace(/,(\s*,)+/g, ',')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

const SYSTEM_PROMPT = `Voce e a Lia, atendente virtual da landingnow, respondendo via WhatsApp.

O cliente ja entrou em contato pelo WhatsApp, entao NAO e necessario coletar lead via formulario.
Seja calorosa, direta e prestativa. Ao final de qualquer conversa onde o cliente demonstrar interesse,
convide-o a continuar com o Welber: https://wa.me/5561985970300

QUEM E O WELBER:
Welber Junior e o founder da landingnow. Brasiliense, atende cada cliente 1:1 pelo WhatsApp, sem intermediario. Faz tudo do zero, do design ao deploy.

PLANOS DA LANDINGNOW:

1. Plano START por R$ 99 - Pix 50%+50%. Entrega 48h. Landing 1 pagina, ate 4 secoes. Subdominio gratis. 1 revisao. 7 dias suporte.
2. Plano PRO por R$ 297 - Pix 50%+50%. O mais escolhido. Entrega 4 dias uteis. Ate 7 secoes. Dominio proprio. Copy persuasiva. 2 revisoes. 7 dias suporte.
3. Plano PREMIUM por R$ 497 - Pix 50%+50%. Entrega 5 dias uteis. Ate 10 secoes. Animacoes, storytelling, FAQ, depoimentos, SEO avancado. 3 revisoes.
4. Plano PREMIUM IA por R$ 997 - Pix 50%+50%. Entrega 7 dias uteis. Tudo do PREMIUM mais IA chatbot 24h treinado pela equipe. 14 dias suporte.
5. SOB ORCAMENTO: SaaS, sistemas complexos, plataformas com login.

TEMATIZACAO SAZONAL: R$ 997 em ate 10x, servico opcional a parte. Muda o visual automaticamente nas datas comemorativas.

PAGAMENTO: Pix 50% ao contratar + 50% na entrega. Tematizacao: ate 10x sem juros.
GARANTIA: Reembolso 100% se nao gostar apos as revisoes do plano.

FORMATACAO:
NUNCA use travessao nem hifen no meio de frase.
NUNCA use markdown com asteriscos, underline ou #.
Nomes de planos em CAIXA ALTA: START, PRO, PREMIUM, PREMIUM IA.
Respostas curtas e diretas, proprias para leitura em tela de celular.
`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'zapi-webhook online' });
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  try {
    const body = req.body;

    if (body.fromMe === true) {
      return res.status(200).json({ ignored: 'fromMe' });
    }

    const phone = body.phone;
    const userMessage =
      body?.text?.message ||
      body?.message ||
      (typeof body?.text === 'string' ? body.text : undefined);

    if (!conversationHistory.has(phone)) {
      console.log('[zapi-webhook] Novo contato. Payload:', JSON.stringify(body));
    }

    if (!phone || !userMessage || typeof userMessage !== 'string') {
      return res.status(200).json({ ignored: 'no-text' });
    }

    addToHistory(phone, 'user', userMessage);
    const history = getHistory(phone);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[zapi-webhook] ANTHROPIC_API_KEY nao configurada');
      return res.status(500).json({ error: 'api-key-missing' });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: history,
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('[zapi-webhook] Anthropic error:', anthropicResponse.status, errText);
      return res.status(200).json({ ok: false, error: 'anthropic-error' });
    }

    const data = await anthropicResponse.json();
    const rawReply = data?.content?.[0]?.text || 'Desculpa, nao entendi. Pode reformular?';
    const reply = sanitizarTexto(rawReply);

    addToHistory(phone, 'assistant', reply);

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