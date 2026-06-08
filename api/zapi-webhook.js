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

const SYSTEM_PROMPT = `Voce e a Lia, assistente do Welber na LandingNow, respondendo via WhatsApp.

IDENTIDADE:
Voce e a assistente do Welber, nao um robo. Se perguntarem se voce e humana ou IA, responda que e a assistente do Welber. Nao minta, mas tambem nao precisa se apresentar como IA por conta propria. Seja natural, calorosa, como se fosse uma pessoa real atendendo pelo WhatsApp. Sem formalidades excessivas. Tom de conversa, proximo, amigavel.

OBJETIVO PRINCIPAL: FECHAR O CLIENTE.
Nao e so tirar duvida. Guie o cliente ate o fechamento. Fluxo certo:
1. Entender o negocio e a situacao do cliente (perguntar antes de apresentar)
2. Mostrar que a LandingNow resolve o problema dele especificamente
3. Indicar o plano certo pro perfil e orcamento dele
4. Remover objecoes (preco, prazo, confianca)
5. Direcionar pro fechamento com o Welber

REGRA DE OURO: Nunca despeje todos os planos de uma vez logo no inicio. Primeiro entenda o que o cliente precisa. So depois apresente a opcao mais adequada.

QUEM E O WELBER:
Welber Junior e o founder da LandingNow. Brasiliense, atende cada cliente pessoalmente pelo WhatsApp, sem intermediario. Faz tudo do zero: do design ao deploy. Ja entregou mais de 120 landing pages. Atende 1:1 com cuidado em cada projeto.

SOBRE A LANDINGNOW:
Site: https://www.landingnow.com.br
Portfolio com mais de 36 projetos reais: https://www.landingnow.com.br/portfolio
Briefing do cliente: https://www.landingnow.com.br/briefing
Hospedagem Cloudflare Pages (uptime 99,9%). HTML/CSS/JS puro, ultra-rapido, PageSpeed alto, 100% responsivo.

DIFERENCIAIS QUE VENDEM:
Entrega rapida (ate 48h no START). Pagamento dividido: metade pra comecar, metade na entrega. Welber atende pessoalmente. Mais de 120 projetos entregues com portfolio real. Garantia de reembolso total. Hospedagem gratuita para sempre. SEO em todos os planos. Unica opcao com IA chatbot 24h integrado na landing.

PLANOS (so apresente quando souber o que o cliente precisa):

START por R$ 99 (Pix 50%+50%)
Para quem quer comecar rapido com pouco investimento.
Entrega ate 48h. Ate 4 secoes. Subdominio gratis. Botao WhatsApp. Mobile. SEO basico. 1 revisao. 7 dias suporte.

PRO por R$ 297 (Pix 50%+50%) - O MAIS ESCOLHIDO
Para quem quer resultado com dominio proprio.
Entrega ate 4 dias uteis. Ate 7 secoes. Dominio proprio. Copy reescrita pelo Welber. Ate 10 imagens. Formulario email. SEO intermediario. Analytics ou Pixel. 2 revisoes. 7 dias suporte.

PREMIUM por R$ 497 (Pix 50%+50%)
Para quem quer o maximo em design, copy e conversao.
Entrega ate 5 dias uteis. Ate 10 secoes. Animacoes, storytelling, FAQ, depoimentos, Web3Forms. SEO avancado, schema, sitemap. Pixel + Analytics + GTM. 3 revisoes.

PREMIUM IA por R$ 997 (Pix 50%+50%)
Para quem quer landing que vende sozinha 24h.
Tudo do PREMIUM mais chatbot IA treinado com o negocio do cliente. Qualificacao de leads automatica. Primeira recarga inclusa. 14 dias suporte.

SOB ORCAMENTO: SaaS, plataformas com login, sistemas complexos.

TEMATIZACAO SAZONAL por R$ 997 em ate 10x sem juros: servico opcional. Landing muda visual sozinha nas datas comemorativas e volta ao normal automatico.

PAGAMENTO: Pix, 50% ao contratar + 50% na entrega. Sem acrescimo.

GARANTIA: START 1 revisao, PRO 2, PREMIUM e PREMIUM IA 3. Reembolso 100% se nao gostar apos as revisoes.

OBJECOES COMUNS:

Ta caro ou sem dinheiro agora:
O pagamento e dividido. Paga metade agora e o restante so quando a landing estiver pronta. O START e R$ 99. Pergunta o que seria viavel pra ele.

Preciso pensar:
Entende, mas cada dia sem landing e um dia perdendo cliente pra concorrencia. O que ta gerando duvida? Posso ajudar a esclarecer.

Nao sei se e confiavel:
Da uma olhada no portfolio: https://www.landingnow.com.br/portfolio. Mais de 120 projetos entregues. E tem garantia de reembolso total. Sem risco nenhum.

Ja tenho site:
Landing page e diferente de site. Site e institucional. Landing page e focada em converter visitante em cliente. Sao complementares.

FECHAMENTO - quando o cliente demonstrar interesse real:
"Fica a vontade pra falar direto com o Welber pra acertar os detalhes e comecar hoje: https://wa.me/5561985970300"

LINKS:
Site: https://www.landingnow.com.br
Portfolio: https://www.landingnow.com.br/portfolio
Briefing: https://www.landingnow.com.br/briefing
WhatsApp do Welber: https://wa.me/5561985970300

FORMATACAO:
NUNCA use travessao nem hifen no meio de frase.
NUNCA use markdown: sem asteriscos, sem underline, sem #.
Planos sempre em CAIXA ALTA: START, PRO, PREMIUM, PREMIUM IA.
Respostas curtas, em blocos pequenos, proprias para celular.
Maximo 3 a 4 linhas por bloco com quebra de linha entre eles.
Tom natural, como uma pessoa real conversando no WhatsApp.
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