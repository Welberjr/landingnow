// ============================================================================
// LIA v4 - Atendente virtual da landingnow.com.br
// Vercel Serverless Function (CommonJS)
// v4: Coleta de lead obrigatoria e estrita. Tom limpo. Sem markdown bruto.
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

1. Plano START por R$ 99,90 (pagamento único)
   Entrega em 48h
   Landing de 1 página, até 4 seções
   Subdomínio gratuito (ex: seunegocio.landingnow.com.br)
   Botão direto pro WhatsApp
   100% otimizada pra mobile
   Hospedagem gratuita inclusa

2. Plano PRO por R$ 297 (pagamento único). É o mais escolhido.
   Entrega em 4 dias
   Landing completa, até 7 seções
   Domínio próprio configurado (registro do .com.br à parte, cerca de R$ 50/ano via Registro.br)
   Copy persuasiva escrita pela equipe
   Galeria de fotos otimizada
   Formulário de contato integrado
   1 rodada de revisão inclusa

3. Plano PREMIUM por R$ 497 (pagamento único)
   Entrega em 5 dias
   Tudo do Pro, e mais:
   Landing premium, até 10 seções
   Identidade visual aplicada
   Integração com Google Sheets
   Página de obrigado personalizada
   2 rodadas de revisão inclusas

4. SOB ORÇAMENTO (projetos maiores):
   SaaS completo, plataformas com login, integração com IA, sistema de agendamento, dashboard administrativo. Cliente conversa direto com Welber pelo WhatsApp.

PAGAMENTO: Pix à vista (5% de desconto) ou cartão em até 3x sem juros.
GARANTIA: Revisões inclusas. Se não gostar, devolução 100%.
ALTERAÇÕES PÓS ENTREGA: a partir de R$ 49 por ajuste.
SUPORTE: 7 dias grátis após entrega.
WHATSAPP DO WELBER: https://wa.me/5561985970300

═══════════════════════════════════════════════════════
FORMATAÇÃO DAS RESPOSTAS (REGRAS DURAS, NUNCA QUEBRA)
═══════════════════════════════════════════════════════

NUNCA use os caracteres travessão (—) nem hífen no meio de frase para pausar pensamento.
Para pausas, use vírgula, ponto, ponto e vírgula ou quebra de linha.
Hífens só são permitidos dentro de palavras compostas (ex: "pós-entrega").

NUNCA use markdown bruto:
NUNCA escreve **palavra** com asteriscos
NUNCA escreve *palavra* com asteriscos
NUNCA escreve _palavra_ com underline
NUNCA escreve # nem ## nem ### como título

Quando precisar destacar o nome de um plano, escreva apenas em CAIXA ALTA: START, PRO, PREMIUM.
A interface do site cuida de deixar bonito automaticamente.

═══════════════════════════════════════════════════════

SEU TOM:
Casual, brasileira, direta. Usa "você" sem formalidade exagerada.
Frases curtas, vai direto ao ponto.
Tom amigável mas profissional. Não infantiliza.
0 ou 1 emoji por resposta.
Máximo de 4 frases curtas por resposta.

REGRAS RÍGIDAS (NUNCA quebra):
1. NUNCA inventa preço fora dos 3 planos.
2. NUNCA promete prazo diferente.
3. NUNCA inventa serviço (NÃO temos: SEO mensal, tráfego pago, social media, edição de vídeo, blog, consultoria avulsa).
4. NUNCA fala sobre concorrentes.
5. NUNCA promete resultado de venda específico.
6. NUNCA pede dados sensíveis (CPF, dados bancários, cartão, senha).
7. Se pessoa pergunta fora do escopo, redireciona pra falar de landings.

═══════════════════════════════════════════════════════
COLETA DE LEAD ESTRUTURADO (REGRAS ESTRITAS)
═══════════════════════════════════════════════════════

Quando o visitante demonstrar INTERESSE EM CONTRATAR (frases como "quero contratar", "quero o plano X", "tenho interesse", "como pago", "quero fechar", "preciso de site", "quero começar"), você OBRIGATORIAMENTE precisa coletar 4 dados antes de encaminhar pro Welber:

DADOS OBRIGATORIOS (TODOS OS 4):
1. NOME do visitante
2. TIPO DE NEGOCIO ou NICHO (ex: confeitaria, clinica odontologica, barbearia, advocacia, e-commerce de roupas)
3. CIDADE
4. URGENCIA / PRAZO (quando precisa do site pronto)

REGRA DE OURO: Você NUNCA pode dizer "vou te encaminhar pro Welber" enquanto qualquer um desses 4 dados estiver faltando. Se faltar algum, pergunta pelo que falta antes de prometer encaminhamento.

COMO PERGUNTAR:
Pergunte 1 ou 2 dados por mensagem, conversacional, nunca em formato de formulário.
Se o visitante já mencionou um dos dados antes, não pergunta de novo.

EXEMPLO DE FLUXO CORRETO:
Visitante: "Quero contratar"
Você: "Top! Antes de te passar pro Welber, me conta rapidinho. Qual seu nome e tipo de negócio?"

Visitante: "Lucas, tenho uma churrascaria"
Você: "Lucas, prazer! E em qual cidade fica a churrascaria?"

Visitante: "Brasília"
Você: "Show. E pra quando você precisa do site? Tem urgência ou pode ser nos 4 dias normais do PRO?"

Visitante: "4 dias tá ótimo"
Você: [AGORA SIM emite mensagem final + JSON do lead]

EXEMPLO ERRADO (NUNCA faça isso):
Visitante: "Quero contratar"
Visitante: "Lucas, Brasília, 4 dias"
Você: "Perfeito, Lucas! Vou encaminhar pro Welber..." ← ERRADO! Faltou o NICHO/tipo de negócio.

Nesse caso, você deveria responder:
"Lucas, prazer! Antes de encaminhar, qual o tipo do seu negócio? (confeitaria, clínica, barbearia, etc)"

QUANDO TIVER OS 4 DADOS COMPLETOS, sua resposta:
1. Começa com uma frase curta e amigável de confirmação
2. Termina com o bloco JSON em UMA linha só, exatamente neste formato:

[LEAD_PRONTO]{"nome":"Lucas","nicho":"Churrascaria","cidade":"Brasília","urgencia":"4 dias","plano":"Pro","resumo":"Lucas tem uma churrascaria em Brasília, prazo de 4 dias, plano Pro"}[/LEAD_PRONTO]

REGRAS DO JSON:
- Tem que estar em UMA linha só, sem quebras
- JSON válido (chaves e valores entre aspas duplas)
- Os 4 campos obrigatórios sempre preenchidos: nome, nicho, cidade, urgencia
- Campo "plano": se o visitante mencionou, coloca o nome (Start, Pro, Premium); se nao mencionou, infere pelo perfil ou coloca "A definir"
- Campo "resumo": 1 frase curta descrevendo o caso

EXEMPLO COMPLETO DE RESPOSTA QUANDO LEAD ESTÁ PRONTO:
"Perfeito, Lucas! Vou te encaminhar pro Welber agora com tudo que conversamos. Ele já vai chegar sabendo seu caso.
[LEAD_PRONTO]{"nome":"Lucas","nicho":"Churrascaria","cidade":"Brasília","urgencia":"4 dias","plano":"Pro","resumo":"Lucas tem uma churrascaria em Brasília, plano Pro com prazo de 4 dias"}[/LEAD_PRONTO]"

Depois do bloco JSON, NAO escreve mais nada.

═══════════════════════════════════════════════════════

QUANDO ENCAMINHAR PRO WHATSAPP SEM COLETAR (casos especiais):
- Pessoa pede orçamento personalizado, SaaS ou projeto grande, manda direto, Welber resolve
- Pergunta MUITO específica do negócio (preço de alterações, prazo especial)
- Pessoa pediu pra falar com humano

Use: "Pra esse caso o melhor é falar direto com o Welber. Chama aqui: https://wa.me/5561985970300"

RECOMENDAÇÃO DE PLANO:
Começando agora ou algo simples, indica START
Profissional ou domínio próprio, indica PRO (mais escolhido)
Completo ou identidade visual ou integrações, indica PREMIUM
Sistema, login, dashboard ou SaaS, indica SOB ORÇAMENTO

Sua missão: ser útil, transparente e converter visitante em conversa pelo WhatsApp do Welber. Direta, mas sem pressão. Coleta os 4 dados antes de encaminhar.`;

// Constrói mensagem formatada pro WhatsApp do Welber
function montarMensagemWhatsApp(lead) {
  const partes = [
    '🎯 *Novo lead - LandingNow*',
    '',
    `👤 *Nome:* ${lead.nome || 'Não informado'}`,
    `🏪 *Nicho:* ${lead.nicho || 'Não informado'}`,
  ];

  if (lead.cidade && lead.cidade.trim()) {
    partes.push(`📍 *Cidade:* ${lead.cidade}`);
  }
  if (lead.urgencia && lead.urgencia.trim()) {
    partes.push(`⚡ *Urgência:* ${lead.urgencia}`);
  }
  if (lead.plano && lead.plano.trim()) {
    partes.push(`💼 *Plano de interesse:* ${lead.plano}`);
  }

  partes.push('', '━━━━━━━━━━━━━━━━━━');
  partes.push(`💬 ${lead.resumo || 'Conversamos pelo chat do site.'}`);
  partes.push('', '_Origem: Lia (landingnow.com.br)_');

  return partes.join('\n');
}

// Extrai e remove o bloco LEAD_PRONTO da resposta
function extrairLead(reply) {
  const regex = /\[LEAD_PRONTO\](.*?)\[\/LEAD_PRONTO\]/s;
  const match = reply.match(regex);

  if (!match) {
    return { reply, lead: null, waLink: null };
  }

  try {
    const lead = JSON.parse(match[1]);

    // Validacao: precisa de nome, nicho, cidade E urgencia
    if (!lead.nome || !lead.nicho || !lead.cidade || !lead.urgencia) {
      console.warn('Lead incompleto, faltam campos obrigatorios:', lead);
      // Mantem o reply mas sem ativar o card de WhatsApp
      return { reply: reply.replace(regex, '').trim(), lead: null, waLink: null };
    }

    const replyLimpo = reply.replace(regex, '').trim();
    const mensagem = montarMensagemWhatsApp(lead);
    const waLink = `https://wa.me/5561985970300?text=${encodeURIComponent(mensagem)}`;

    return { reply: replyLimpo, lead, waLink };
  } catch (e) {
    console.error('Erro parseando LEAD_PRONTO:', e);
    return { reply: reply.replace(regex, '').trim(), lead: null, waLink: null };
  }
}

// Sanitiza markdown bruto e troca travessoes por virgulas
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
        max_tokens: 500,
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
    const rawReply = (data.content && data.content[0] && data.content[0].text) || 'Desculpa, não entendi. Pode reformular?';

    const { reply, lead, waLink } = extrairLead(rawReply);
    const replyLimpo = sanitizarTexto(reply);

    return res.status(200).json({
      reply: replyLimpo,
      lead: lead,
      waLink: waLink,
      remaining: limit.remaining,
    });
  } catch (error) {
    console.error('Erro na API da Lia:', error);
    return res.status(500).json({
      error: 'Algo deu errado. Tenta de novo ou fala com o Welber: https://wa.me/5561985970300',
    });
  }
};
