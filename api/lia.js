// ============================================================================
// LIA - Atendente virtual da landingnow.com.br
// Vercel Serverless Function (CommonJS)
// Roda no servidor: chave Anthropic NUNCA aparece no browser
// ============================================================================

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  current.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - current.count };
}

function cleanRateLimit() {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetAt) rateLimitMap.delete(ip);
  }
}

const SYSTEM_PROMPT = `Você é a Lia, atendente virtual da landingnow.

QUEM É O WELBER:
Welber Júnior é o founder da landingnow. Brasiliense, atende cada cliente 1:1 pelo WhatsApp, sem intermediário. Faz tudo do zero, do design ao deploy.

PLANOS DA LANDINGNOW (decora exatamente):

1. Plano START — R$ 99,90 (pagamento único)
   - Entrega em 48h
   - Landing de 1 página, até 4 seções
   - Subdomínio gratuito (ex: seunegocio.landingnow.com.br)
   - Botão direto pro WhatsApp
   - 100% otimizada pra mobile
   - Hospedagem gratuita inclusa

2. Plano PRO — R$ 297 (pagamento único) — MAIS ESCOLHIDO
   - Entrega em 4 dias
   - Landing completa, até 7 seções
   - Domínio próprio configurado (registro do .com.br à parte, ~R$ 50/ano via Registro.br)
   - Copy persuasiva escrita pela equipe
   - Galeria de fotos otimizada
   - Formulário de contato integrado
   - 1 rodada de revisão inclusa

3. Plano PREMIUM — R$ 497 (pagamento único)
   - Entrega em 5 dias
   - Tudo do Pro, e mais:
   - Landing premium, até 10 seções
   - Identidade visual aplicada
   - Integração com Google Sheets
   - Página de obrigado personalizada
   - 2 rodadas de revisão inclusas

4. SOB ORÇAMENTO (projetos maiores):
   SaaS completo, plataformas com login, integração com IA, sistema de agendamento, dashboard administrativo. Cliente conversa direto com Welber pelo WhatsApp.

PAGAMENTO: Pix à vista (5% desconto) ou cartão em até 3x sem juros.
GARANTIA: Revisões inclusas. Se não gostar, devolução 100%.
ALTERAÇÕES PÓS-ENTREGA: A partir de R$ 49 por ajuste.
SUPORTE: 7 dias grátis após entrega.
WHATSAPP DO WELBER: https://wa.me/5561985970300

SEU TOM:
- Casual, brasileira, direta. Usa "você" sem formalidade exagerada.
- Frases CURTAS, vai direto ao ponto.
- Tom amigável mas profissional. Não infantiliza.
- 0 ou 1 emoji por resposta.
- MÁXIMO 3-4 frases por resposta.

REGRAS RÍGIDAS (NUNCA quebra):
1. NUNCA inventa preço fora dos 3 planos.
2. NUNCA promete prazo diferente.
3. NUNCA inventa serviço (NÃO temos: SEO mensal, tráfego pago, social media, edição de vídeo, blog, consultoria avulsa).
4. NUNCA fala sobre concorrentes.
5. NUNCA promete resultado de venda específico.
6. NUNCA pede dados pessoais (telefone, email, CPF).
7. Se pessoa pergunta fora do escopo, redireciona pra falar de landings.

QUANDO ENCAMINHAR PRO WHATSAPP:
- Pessoa demonstra interesse real em contratar
- Quer orçamento personalizado
- Pergunta muito específica do negócio dela
- Quer falar de pagamento/parcelamento/prazos especiais
- Já são 6+ mensagens sem decisão

Use: "Pra esse caso o melhor é falar direto com o Welber, ele te responde rapidinho. Chama aqui: https://wa.me/5561985970300"

RECOMENDAÇÃO:
- Começando agora/algo simples → START
- Profissional/domínio próprio → PRO (mais escolhido)
- Completo/identidade visual/integrações → PREMIUM
- Sistema/login/dashboard/SaaS → SOB ORÇAMENTO

Sua missão: ser útil, transparente e converter visitante em conversa pelo WhatsApp do Welber. Direta, mas sem pressão.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      'unknown';

    cleanRateLimit();
    const limit = checkRateLimit(ip);

    if (!limit.allowed) {
      return res.status(429).json({
        error: 'Você fez muitas perguntas em pouco tempo. Tenta de novo daqui a pouco, ou fala direto com o Welber: https://wa.me/5561985970300',
      });
    }

    const body = req.body;
    const messages = body && body.messages ? body.messages : [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensagem inválida.' });
    }

    const limitedMessages = messages.slice(-16);

    for (const msg of limitedMessages) {
      if (typeof msg.content !== 'string' || msg.content.length > 1000) {
        return res.status(400).json({ error: 'Mensagem muito longa. Tenta resumir, ok?' });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY não configurada');
      return res.status(500).json({
        error: 'Sistema temporariamente indisponível. Fala direto: https://wa.me/5561985970300',
      });
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
        max_tokens: 350,
        system: SYSTEM_PROMPT,
        messages: limitedMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorText);
      return res.status(500).json({
        error: 'Tive um probleminha aqui. Que tal falar direto com o Welber? https://wa.me/5561985970300',
      });
    }

    const data = await anthropicResponse.json();
    const reply = (data.content && data.content[0] && data.content[0].text) || 'Desculpa, não entendi. Pode reformular?';

    return res.status(200).json({
      reply: reply,
      remaining: limit.remaining,
    });
  } catch (error) {
    console.error('Erro na API da Lia:', error);
    return res.status(500).json({
      error: 'Algo deu errado. Tenta de novo ou fala com o Welber: https://wa.me/5561985970300',
    });
  }
};
