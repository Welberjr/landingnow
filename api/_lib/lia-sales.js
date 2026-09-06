// Regras deterministicas compartilhadas pelo webhook e pelo follow-up.
const EXEMPLO_ARQUITETURA = 'https://renata-collodetti-arquitetura.pages.dev';
const PORTFOLIO = 'https://www.landingnow.com.br/portfolio';
const ACOLHIDA_HUMANO = 'Vou encaminhar sua mensagem ao Welber e ao Caio. Eles estão em reunião e retornam assim que estiverem disponíveis.';

function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function classificarDesinteresse(texto) {
  const t = normalizar(texto);
  // "Enviei o comprovante por engano" corrige uma midia, nao encerra o contato.
  // Aceite apenas a abertura da conversa ou a adicao do contato por acidente.
  const interesseApesarDoAcidente = /\bmas\b[^.!?]{0,70}\b(?:quero contratar|tenho interesse|quero saber|quero fazer|quero continuar)\b/.test(t);
  const acidental = (!interesseApesarDoAcidente && /(?<!nao )\b(?:entrei|adicionei|cliquei|chamei|abri)(?: (?:aqui|no anuncio|no link|nesta conversa|nessa conversa|essa conversa|a conversa|o contato|seu contato|esse contato|voce|voces))? (?:sem querer|por engano)\b/.test(t))
    || /^(?:(?:oi|ola|desculpa|desculpe)[\s,!.]*)?(?:eu )?(?:errei|foi engano|numero errado)[\s,!.]*(?:(?:desculpa|desculpe|obrigad[oa])[\s,!.]*)?$/.test(t);
  const recusa = /\bnao (?:quero|tenho interesse em) (?:mais )?(?:receber )?(?:informac(?:ao|oes)|contato|mensagens|nada)(?: nenhuma)?(?:[.!?]|$|,? (?:obrigad[oa]|desculp[ae])\b)/.test(t)
    || /^(?:eu )?nao (?:quero|tenho interesse)[\s,!.]*(?:(?:mais|obrigad[oa])[\s,!.]*)?$/.test(t)
    || /\bquero informac(?:ao|oes) nao\b/.test(t);
  return { encerrar: acidental || recusa, motivo: acidental ? 'contato-acidental' : recusa ? 'sem-interesse' : null };
}

function primeiroNomeConfiavel(nome) {
  const n = String(nome || '').trim();
  if (!/^[\p{L}]+(?:[ '-][\p{L}]+){0,5}$/u.test(n)) return null;
  if (/^[A-Z]{2,3}$/.test(n)) return null;
  if (/\b(arquitetura|arquiteto|arquiteta|engenharia|studio|estudio|clinica|loja|restaurante|marketing|contato|cliente|usuario|user|name|teste|empresa|imoveis|imobiliaria|barbearia|consultoria|atendimento|comercial|filha|filho|mae|pai|mamae|papai|amorzinho)\b/.test(normalizar(n))) return null;
  const primeiro = n.split(/\s+/)[0];
  return primeiro.length >= 2 && primeiro.length <= 25 ? primeiro : null;
}

// Campos confirmados em https://developer.z-api.io/webhooks/on-message-received-examples#anuncios.
// Nao adivinha campos da Cloud API nem persiste o payload inteiro.
function extrairReferenciaAnuncio(body) {
  const ad = body && body.externalAdReply;
  if (!ad || typeof ad !== 'object' || ad.sourceType !== 'ad') return null;
  const ref = {};
  for (const campo of ['title', 'body', 'sourceType', 'sourceId', 'sourceUrl', 'ctwaClid']) {
    if (typeof ad[campo] === 'string' && ad[campo].trim()) ref[campo] = ad[campo].trim().slice(0, campo === 'body' ? 1200 : 500);
  }
  return ref;
}

function contextoDeArquitetura(mensagemCliente, referral) {
  const texto = normalizar(mensagemCliente);
  // Uma negativa explicita do cliente prevalece sobre o publico do anuncio.
  if (/\bnao sou arquitet[oa]\b|\bnao (?:e|trabalho) (?:com |de )?arquitetura\b/.test(texto)) return false;
  return /\barquitet(?:ura|o|a|os|as)\b/.test(texto + ' ' + normalizar(referral ? `${referral.title || ''} ${referral.body || ''}` : ''));
}

function ehEntradaGenerica(texto) {
  const t = normalizar(texto).replace(/[!?.,;:]/g, '').replace(/\btenho interesse e /, '').trim();
  if (!t || t.length > 180 || classificarDesinteresse(t).encerrar) return false;
  return /^(?:oi+|ola|bom dia|boa tarde|boa noite)(?: tudo bem)?$/.test(t)
    || /^(?:(?:oi+|ola|bom dia|boa tarde|boa noite) )?(?:(?:eu )?(?:tenho interesse e |gostaria de |quero |queria |posso ter |poderia ter |pode me (?:passar|dar) ))?(?:mais )?informac(?:ao|oes)(?: (?:sobre (?:isso|o anuncio|a landing page|o site)|por favor))*$/.test(t)
    || /^(?:(?:oi+|ola) )?(?:tenho interesse|quero saber mais|gostaria de saber mais)(?: por favor)?$/.test(t);
}

function ofertaInicial(contextoArquitetura) {
  const produto = contextoArquitetura ? 'uma página para apresentar projetos de arquitetura e facilitar pedidos de orçamento pelo WhatsApp' : 'uma página profissional para apresentar seu negócio e facilitar o contato pelo WhatsApp';
  const exemplo = contextoArquitetura ? EXEMPLO_ARQUITETURA : PORTFOLIO;
  return `Olá! Aqui é a Lia da LandingNow. Criamos ${produto}.\nO PRO custa R$ 497: 50% na entrada e 50% após aprovação, no Pix. Entrega em até 48 horas após a entrada e o envio completo dos materiais.\nVeja um exemplo${contextoArquitetura ? '' : ' no portfólio'}: ${exemplo}\nÉ esse tipo de página que você procura?`;
}

function respostaInicialComercial({ mensagemCliente, historico = [], referral } = {}) {
  if (historico.some(m => m && m.role === 'assistant') || !ehEntradaGenerica(mensagemCliente)) return null;
  return ofertaInicial(contextoDeArquitetura(mensagemCliente, referral));
}

function pedeAtendimentoHumano(texto) {
  const t = normalizar(texto);
  if (/\bnao (?:quero|preciso|prefiro) falar com\b/.test(t) || /\bquero continuar com voce\b/.test(t)) return false;
  return /\b(?:quero|queria|preciso|gostaria|posso|pode|prefiro)\b[^.!?]{0,35}\b(?:falar|conversar|atendido|atendida)\b[^.!?]{0,30}\b(?:humano|humana|pessoa|atendente|responsavel|welber|caio)\b/.test(t)
    || /\b(?:chama|chame|chamar|transfere|transferir)\b[^.!?]{0,25}\b(?:responsavel|humano|pessoa|welber|caio)\b/.test(t);
}

function respostaPublicaSegura(texto, { mensagemCliente = '', contextoArquitetura = false, handoff = false } = {}) {
  const bruto = String(texto || '').trim();
  const t = normalizar(bruto);
  let motivo = null;
  if (!bruto) motivo = 'resposta-vazia';
  else if (/\[\[|\]\]|\[\/?LEAD_PRONTO\]|```|<\/?(?:analysis|thinking|think|reasoning|system|assistant|scratchpad)\b|(?:^|\n)\s*(?:analysis|thinking|analise interna|raciocinio|planejamento|resposta final|AVISAR_WELBER|CRM|system|assistant)\s*:/i.test(bruto)) motivo = 'marcador-interno';
  else if (/\b(?:vou|devo|preciso) (?:tratar|classificar|considerar|analisar|responder|enviar|gerar|formular|abordar)\b[^.!?]{0,100}\b(?:caso especial|follow.?up|cliente|lead|resposta|mensagem|contexto)\b|\b(?:cliente|lead|ele|ela|[a-z]+) nunca respondeu\b|\b(?:meu|o|no|do) (?:prompt|system prompt|raciocinio interno|historico interno)\b|\b(?:devo|preciso) (?:seguir|respeitar) (?:as |a |o )?(?:instruc|regra)|\b(?:ficha interna|marcador crm|texto interno|modo explorando|modo decidido)\b/.test(t)) motivo = 'planejamento-interno';
  else if (/\b(?:retorno|retorna|respondem|responde|volto|voltamos|e) (?:bem )?rapidinho\b|\b(?:ja|logo) (?:te )?(?:atende|atendem|retorna|retornam)\b/.test(t)) motivo = 'prazo-humano-nao-confirmado';
  else if (/\b(?:pagamento|pix) (?:ja )?(?:foi )?(?:confirmado|aprovado|conferido)\b/.test(t)) motivo = 'pagamento-nao-verificado';
  else if (/(?<!nao )(?<!nunca )(?<!nao te )(?<!nao lhe )\b(?:garantimos|garanto|garante)\b[^.!?]{0,45}\b(?:vendas|clientes|conversoes|faturamento)\b/.test(t)) motivo = 'resultado-garantido';
  if (!motivo) return { texto: bruto, bloqueada: false, motivo: null };
  let fallback = handoff ? ACOLHIDA_HUMANO : 'Desculpe, minha resposta não ficou clara. Vou pedir à equipe que confira sua dúvida e continue o atendimento por aqui.';
  if (!handoff && ehEntradaGenerica(mensagemCliente)) fallback = ofertaInicial(contextoArquitetura);
  else if (!handoff && /\b(?:preco|valor|custa)\b/.test(normalizar(mensagemCliente))) fallback = 'O PRO custa R$ 497. No Pix, são 50% na entrada e 50% após sua aprovação. Também há pagamento por cartão em até 12x.';
  else if (!handoff && /\b(?:prazo|demora|48h|dias|horas)\b/.test(normalizar(mensagemCliente))) fallback = 'O prazo do PRO é de até 48 horas após o pagamento da entrada e o envio completo dos materiais.';
  else if (/\b(?:paguei|comprovante|fiz o pix|fiz o pagamento)\b/.test(normalizar(mensagemCliente)) || motivo === 'pagamento-nao-verificado') fallback = 'Recebi sua mensagem. O Welber precisa conferir o pagamento antes da confirmação; vou encaminhar para ele.';
  return { texto: fallback, bloqueada: true, motivo };
}

module.exports = { ACOLHIDA_HUMANO, EXEMPLO_ARQUITETURA, classificarDesinteresse, primeiroNomeConfiavel, extrairReferenciaAnuncio, contextoDeArquitetura, respostaInicialComercial, respostaPublicaSegura, pedeAtendimentoHumano };
