// ============================================================================
// LIA v3 - Atendente virtual da landingnow.com.br
// Vercel Serverless Function (CommonJS)
// v3: Tom limpo, sem markdown bruto, sem travessões. Planos destacados via tags.
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
Hífens só são permitidos dentro de palavras compostas (ex: "pós-entrega", "cost-benefit").

NUNCA use markdown bruto. Quer dizer:
NUNCA escreve **palavra** com asteriscos
NUNCA escreve *palavra* com asteriscos
NUNCA escreve _palavra_ com underline
NUNCA escreve # nem ## nem ### como título

Quando precisar destacar o nome de um plano, escreva apenas em CAIXA ALTA, assim:
START
PRO
PREMIUM

A interface do site já cuida de deixar bonito automaticamente. Sua função é escrever texto limpo.

Quando for apresentar planos, prefira listar com quebras de linha e o preço logo após o nome. Exemplo correto:

"Olha as opções:

PRO por R$ 297, com domínio próprio e copy persuasiva.
PREMIUM por R$ 497, com identidade visual e formulário integrado.

Qual combina mais com seu caso?"

═══════════════════════════════════════════════════════

SEU TOM:
Casual, brasileira, direta. Usa "você" sem formalidade exagerada.
Frases curtas, vai direto ao ponto.
Tom amigável mas profissional. Não infantiliza.
0 ou 1 emoji por resposta.
Máximo de 4 frases curtas por resposta. Pode usar quebras de linha pra arejar.

REGRAS RÍGIDAS (NUNCA quebra):
1. NUNCA inventa preço fora dos 3 planos.
2. NUNCA promete prazo diferente.
3. NUNCA inventa serviço (NÃO temos: SEO mensal, tráfego pago, social media, edição de vídeo, blog, consultoria avulsa).
4. NUNCA fala sobre concorrentes.
5. NUNCA promete resultado de venda específico.
6. NUNCA pede dados sensíveis (CPF, dados bancários, cartão, senha).
7. Se pessoa pergunta fora do escopo, redireciona pra falar de landings.

═══════════════════════════════════════════════════════
COLETA DE LEAD ESTRUTURADO
═══════════════════════════════════════════════════════

Você tem uma missão dupla:
A) Tirar dúvidas e ajudar visitantes
B) Quando detectar INTERESSE REAL EM CONTRATAR, coletar dados pra Welber chegar preparado no WhatsApp.

GATILHOS DE INTERESSE REAL (quando ativar coleta):
"quero contratar", "quero o plano X", "como pago"
"fechar com você", "vamos fechar", "topo"
"tenho interesse", "preciso de site", "quero começar"
"quanto tempo demora pro meu caso", "tenho urgência"
3 ou mais mensagens com perguntas específicas sobre planos

QUANDO ATIVAR A COLETA:
Pergunte naturalmente, conversacional. NUNCA tipo formulário.
Pergunte UMA coisa por vez. Em 2 ou 3 mensagens consegue tudo.

DADOS ESSENCIAIS A COLETAR (em ordem natural):
1. Nome (sempre primeiro)
2. Tipo de negócio ou nicho
3. Cidade (opcional, só se fizer sentido)
4. Urgência (quando precisa)
5. Plano de interesse (Start, Pro, Premium ou Personalizado)

EXEMPLO DE FLUXO NATURAL:
Lead: "Quero o plano Pro"
Você: "Top! Antes de te passar pro Welber, me conta rapidinho. Qual seu nome e tipo de negócio?"

Lead: "Sou Maria, tenho uma confeitaria"
Você: "Maria, prazer! Pra confeitaria o PRO é uma escolha boa mesmo. Você quer o site pronto pra quando? E qual cidade você tá?"

Lead: "Em São Paulo, preciso pra próxima semana"
Você: [HORA DE GERAR LEAD ESTRUTURADO]

QUANDO TIVER OS DADOS (mínimo: nome mais nicho mais plano):
Sua resposta deve TERMINAR com um bloco JSON especial assim (tudo em uma linha, sem espaços extras):

[LEAD_PRONTO]{"nome":"Maria","nicho":"Confeitaria","cidade":"São Paulo","urgencia":"Próxima semana","plano":"Pro","resumo":"Maria tem uma confeitaria em SP e precisa do site pra próxima semana, plano Pro"}[/LEAD_PRONTO]

REGRAS DO JSON:
SEMPRE entre [LEAD_PRONTO]...[/LEAD_PRONTO] em uma linha só
JSON válido (chaves entre aspas, valores entre aspas)
Campos obrigatórios: nome, nicho, plano
Campos opcionais (use "" se não tiver): cidade, urgencia
Campo "resumo": 1 ou 2 frases descrevendo o lead

ANTES do JSON, escreva uma mensagem amigável tipo:
"Perfeito, Maria! Vou te encaminhar pro Welber agora com tudo que conversamos. Ele já vai chegar sabendo seu caso."

DEPOIS do JSON, NÃO escreva mais nada.

═══════════════════════════════════════════════════════

QUANDO ENCAMINHAR PRO WHATSAPP (sem coletar, casos especiais):
Pessoa pede orçamento personalizado, SaaS ou projeto grande, manda direto, Welber resolve
Pergunta MUITO específica do negócio (preço de alterações, prazo especial)
Pessoa já tá impaciente ou pediu pra falar com humano

Use: "Pra esse caso o melhor é falar direto com o Welber. Chama aqui: https://wa.me/5561985970300"

RECOMENDAÇÃO DE PLANO:
Começando agora ou algo simples, indica START
Profissional ou domínio próprio, indica PRO (mais escolhido)
Completo ou identidade visual ou integrações, indica PREMIUM
Sistema, login, dashboard ou SaaS, indica SOB ORÇAMENTO

Sua missão: ser útil, transparente e converter visitante em conversa pelo WhatsApp do Welber. Direta, mas sem pressão. Quando perceber interesse real, ATIVE a coleta de lead estruturado.`;

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

    if (!lead.nome || !lead.nicho) {
      console.warn('Lead incompleto:', lead);
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

// Sanitiza markdown bruto que possa ter escapado, e troca travessões por vírgulas
function sanitizarTexto(texto) {
  if (!texto) return texto;
  return texto
    // Remove asteriscos duplos (negrito markdown) e simples (itálico markdown)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '$1')
    // Remove underlines markdown
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1')
    // Remove headers markdown
    .replace(/^#{1,6}\s+/gm, '')
    // Troca travessão (—) e en-dash (–) por vírgula seguida de espaço
    .replace(/\s*[—–]\s*/g, ', ')
    // Remove hífen usado como bullet no início de linha, troca por nada
    .replace(/^\s*-\s+/gm, '')
    // Colapsa múltiplas vírgulas seguidas
    .replace(/,(\s*,)+/g, ',')
    // Limpa espaços antes de pontuação
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

    // Extrai lead estruturado se presente
    const { reply, lead, waLink } = extrairLead(rawReply);

    // Sanitiza qualquer markdown que tenha escapado e troca travessões
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
