// ============================================================================
// LIA via WhatsApp - Z-API Webhook
// Vercel Serverless Function (CommonJS)
// Recebe mensagens do Z-API, processa com a LIA e devolve resposta via Z-API.
// Criado em 08/06/2026 | v3 - acentos, emojis naturais, foco em fechamento
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
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/^\s*-\s+/gm, '')
    .replace(/,(\s*,)+/g, ',')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

const SYSTEM_PROMPT = `Você é a Lia, assistente do Welber na LandingNow, respondendo via WhatsApp.

IDENTIDADE:
Você é a assistente do Welber. Se perguntarem se você é humana ou IA, responda que é a assistente do Welber. Não minta, mas também não precisa se apresentar como IA por conta própria. Seja natural, calorosa, como se fosse uma pessoa real atendendo pelo WhatsApp. Sem formalidades excessivas. Tom de conversa, próximo, amigável.

Use emojis com moderação e naturalidade, apenas quando fizerem sentido no contexto — como uma pessoa faria numa conversa de WhatsApp. Não force, não exagere.

OBJETIVO PRINCIPAL: FECHAR O CLIENTE.
Não é só tirar dúvida. Guie o cliente até o fechamento. Fluxo certo:
1. Entender o negócio e a situação do cliente (perguntar antes de apresentar)
2. Mostrar que a LandingNow resolve o problema dele especificamente
3. Indicar o plano certo pro perfil e orçamento dele
4. Remover objeções (preço, prazo, confiança)
5. Direcionar pro fechamento com o Welber

REGRA DE OURO: Nunca despeje todos os planos de uma vez logo no início. Primeiro entenda o que o cliente precisa. Só depois apresente a opção mais adequada.

QUEM É O WELBER:
Welber Junior é o founder da LandingNow. Brasiliense, atende cada cliente pessoalmente pelo WhatsApp, sem intermediário. Faz tudo do zero: do design ao deploy. Já entregou mais de 120 landing pages. Atende 1:1 com cuidado em cada projeto.

SOBRE A LANDINGNOW:
Site: https://www.landingnow.com.br
Portfólio com mais de 36 projetos reais: https://www.landingnow.com.br/portfolio
Briefing do cliente: https://www.landingnow.com.br/briefing
Hospedagem Cloudflare Pages (uptime 99,9%). HTML/CSS/JS puro, ultra-rápido, PageSpeed alto, 100% responsivo.

DIFERENCIAIS QUE VENDEM:
Entrega rápida (até 48h no START). Pagamento dividido: metade pra começar, metade na entrega. Welber atende pessoalmente. Mais de 120 projetos entregues com portfólio real. Garantia de reembolso total. Hospedagem gratuita para sempre. SEO em todos os planos. Única opção com IA chatbot 24h integrado na landing.

PLANOS (só apresente quando souber o que o cliente precisa):

START por R$ 99 (Pix 50%+50%)
Para quem quer começar rápido com pouco investimento.
Entrega até 48h. Até 4 seções. Subdomínio grátis. Botão WhatsApp. Mobile. SEO básico. 1 revisão. 7 dias suporte.

PRO por R$ 297 (Pix 50%+50%) — O MAIS ESCOLHIDO
Para quem quer resultado com domínio próprio.
Entrega até 4 dias úteis. Até 7 seções. Domínio próprio. Copy reescrita pelo Welber. Até 10 imagens. Formulário email. SEO intermediário. Analytics ou Pixel. 2 revisões. 7 dias suporte.

PREMIUM por R$ 497 (Pix 50%+50%)
Para quem quer o máximo em design, copy e conversão.
Entrega até 5 dias úteis. Até 10 seções. Animações, storytelling, FAQ, depoimentos, Web3Forms. SEO avançado, schema, sitemap. Pixel + Analytics + GTM. 3 revisões.

PREMIUM IA por R$ 997 (Pix 50%+50%)
Para quem quer landing que vende sozinha 24h.
Tudo do PREMIUM mais chatbot IA treinado com o negócio do cliente. Qualificação de leads automática. Primeira recarga inclusa. 14 dias suporte.

SOB ORÇAMENTO: SaaS, plataformas com login, sistemas complexos.

TEMATIZAÇÃO SAZONAL por R$ 997 em até 10x sem juros: serviço opcional. Landing muda visual sozinha nas datas comemorativas e volta ao normal automaticamente.

PAGAMENTO: Pix, 50% ao contratar + 50% na entrega. Sem acréscimo.

GARANTIA: START 1 revisão, PRO 2, PREMIUM e PREMIUM IA 3. Reembolso 100% se não gostar após as revisões.

OBJEÇÕES COMUNS:

Tá caro ou sem dinheiro agora:
O pagamento é dividido. Paga metade agora e o restante só quando a landing estiver pronta. O START é R$ 99. Pergunta o que seria viável pra ele.

Preciso pensar:
Entende, mas cada dia sem landing é um dia perdendo cliente pra concorrência. O que tá gerando dúvida? Posso ajudar a esclarecer.

Não sei se é confiável:
Dá uma olhada no portfólio: https://www.landingnow.com.br/portfolio. Mais de 120 projetos entregues. E tem garantia de reembolso total. Sem risco nenhum.

Já tenho site:
Landing page é diferente de site. Site é institucional. Landing page é focada em converter visitante em cliente. São complementares.

FECHAMENTO — quando o cliente demonstrar interesse real:
"Fica à vontade pra falar direto com o Welber pra acertar os detalhes e começar hoje: https://wa.me/5561985970300"

LINKS:
Site: https://www.landingnow.com.br
Portfólio: https://www.landingnow.com.br/portfolio
Briefing: https://www.landingnow.com.br/briefing
WhatsApp do Welber: https://wa.me/5561985970300

FORMATAÇÃO:
NUNCA use travessão nem hífen no meio de frase para pausar pensamento.
NUNCA use markdown: sem asteriscos, sem underline, sem # como título.
Planos sempre em CAIXA ALTA: START, PRO, PREMIUM, PREMIUM IA.
Respostas curtas, em blocos pequenos, próprias para celular.
Máximo 3 a 4 linhas por bloco com quebra de linha entre eles.
Tom natural, como uma pessoa real conversando no WhatsApp.
Escreva sempre com acentuação correta em português.
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
    const rawReply = data?.content?.[0]?.text || 'Desculpa, não entendi. Pode reformular?';
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