// ============================================================================
// LIA - Follow-up de lead frio  |  v1 (16/08/2026)
// Roda uma vez por dia pelo Cron da Vercel. Procura quem conversou, demonstrou
// interesse e sumiu, e manda UMA unica retomada. Uma por lead, pra sempre.
//
// Regras que este arquivo respeita, todas decididas com o Welber:
//  - Uma retomada por lead. Depois disso ele nunca mais recebe nada daqui.
//  - So conversa que aconteceu DEPOIS que isso subiu (FOLLOWUP_DESDE). Lead
//    antigo do banco nao entra sozinho: pra isso existe o modo ?retroativo=1.
//  - Nunca em quem esta pausado (inclui quem pediu pra parar e quem os socios
//    assumiram na mao), nunca em quem ja e cliente, nunca em ganho ou perdido.
//  - So entre 9h e 19h de Brasilia.
// ============================================================================

const nucleo = require('./zapi-webhook.js');
const H = nucleo.helpers;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY;

const PARADO_MS = 48 * 60 * 60 * 1000;       // 2 dias sem responder
// Teto por execucao. Cada lead custa uma chamada de IA mais o envio, e a
// funcao tem 60s. Sobrando lead, ele entra na rodada do dia seguinte.
const MAX_POR_RODADA = 6;
const ESTAGIOS_QUE_VALEM = ['novo', 'qualificando', 'proposta', 'negociando'];

// Hora de Brasilia sem depender de biblioteca: BRT e UTC-3 o ano todo.
function horaBrasilia(agora) {
  return new Date(agora.getTime() - 3 * 60 * 60 * 1000).getUTCHours();
}

async function buscarLeadsFrios(limiteIso, desdeIso, retroativo) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const filtros = [
    'followup_enviado_em=is.null',
    'eh_cliente=is.false',
    'estagio=in.(' + ESTAGIOS_QUE_VALEM.join(',') + ')',
    'ultima_mensagem_em=lt.' + encodeURIComponent(limiteIso),
    'order=ultima_mensagem_em.asc',
    'limit=' + MAX_POR_RODADA,
    'select=*',
  ];
  if (!retroativo) filtros.push('ultima_mensagem_em=gte.' + encodeURIComponent(desdeIso));
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/lia_leads?${filtros.join('&')}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) { console.error('[followup] busca falhou:', r.status, await r.text()); return []; }
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[followup] erro na busca:', e);
    return [];
  }
}

// Escreve a retomada com o contexto real da conversa. Nada de "oi, tudo bem":
// ela volta no assunto de onde parou.
async function escreverRetomada(lead, historico) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const contexto = (historico || [])
    .filter((m) => m && m.content && typeof m.content === 'string')
    .slice(-12)
    .map((m) => (m.role === 'user' ? 'Cliente: ' : 'Voce: ') + m.content)
    .join('\n');

  const instrucao = `${H.SYSTEM_PROMPT}${H.resumoDoLead(lead)}

AGORA E UMA RETOMADA, NAO UMA CONVERSA EM ANDAMENTO. Leia com atencao:
Faz dois dias que essa pessoa parou de responder. Voce vai mandar UMA mensagem pra retomar, e essa e a unica chance. Regras dessa mensagem:
1. Volte no assunto exato de onde a conversa parou. NUNCA comece com "oi, tudo bem?" nem com apresentacao, ela ja te conhece.
2. Curtissima: no maximo duas linhas. Uma pergunta so, leve, sem cobranca e sem tom de cobranca.
3. Nada de "ainda tem interesse?". Traga algo util: lembre o que ficou combinado, ou pergunte o que ficou pendente na cabeca dela.
4. Se a objecao registrada foi preco, esse e o momento certo de apresentar o START de R$ 297 como alternativa mais em conta, de forma natural.
5. Se ela ja tinha recusado tambem o START, ai voce pode fazer a oferta da AMOSTRA SEM CUSTO, seguindo as regras dela.
6. Nunca diga que passou dois dias, nunca diga que e um sistema, nunca fale em follow-up.

Conversa ate aqui:
${contexto || '(sem historico salvo)'}

Escreva agora somente a mensagem que vai pro WhatsApp dela, mais o marcador do CRM no final.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: H.MODELO,
        max_tokens: 400,
        system: instrucao,
        messages: [{ role: 'user', content: 'Escreva a mensagem de retomada.' }],
      }),
    });
    if (!r.ok) { console.error('[followup] anthropic:', r.status, await r.text()); return null; }
    const data = await r.json();
    return data?.content?.[0]?.text || null;
  } catch (e) {
    console.error('[followup] erro na anthropic:', e);
    return null;
  }
}

module.exports = async function handler(req, res) {
  // O Cron da Vercel manda Authorization: Bearer CRON_SECRET. O ?token= serve
  // pra disparar na mao, pra teste.
  const segredo = process.env.CRON_SECRET;
  const auth = String(req.headers.authorization || '');
  const token = String((req.query && req.query.token) || '');
  if (!segredo || (auth !== 'Bearer ' + segredo && token !== segredo)) {
    return res.status(401).json({ error: 'nao autorizado' });
  }

  const agora = new Date();
  const hora = horaBrasilia(agora);
  const forcar = String((req.query && req.query.forcar) || '') === '1';
  if ((hora < 9 || hora >= 19) && !forcar) {
    return res.status(200).json({ ok: true, pulado: 'fora da janela de 9h as 19h', horaBrasilia: hora });
  }

  const retroativo = String((req.query && req.query.retroativo) || '') === '1';
  const limiteIso = new Date(agora.getTime() - PARADO_MS).toISOString();
  const desdeIso = process.env.FOLLOWUP_DESDE || '2026-08-16T00:00:00Z';

  const leads = await buscarLeadsFrios(limiteIso, desdeIso, retroativo);
  const enviados = [];
  const pulados = [];

  for (const lead of leads) {
    const phone = lead.phone;
    // A conversa fica salva com o numero cru que o Z-API mandou, que nem sempre
    // e igual a chave canonica do lead. E a pausa pode ter sido gravada num LID,
    // por isso expandirIds antes de conferir.
    const chaveConversa = lead.chave_conversa || phone;
    try {
      const ids = await H.expandirIds([phone, chaveConversa]);
      if (await H.estaPausadaQualquer(ids)) { pulados.push(phone + ' (pausado)'); continue; }

      const { mensagens: historico, nome } = await H.lerConversa(chaveConversa);
      const bruto = await escreverRetomada(lead, historico);
      if (!bruto) { pulados.push(phone + ' (sem texto)'); continue; }

      const { limpo: semAvisos } = H.extrairAvisos(bruto);
      const { limpo, crm } = H.extrairCrm(semAvisos);
      const texto = H.sanitizarTexto(limpo);
      if (!texto) { pulados.push(phone + ' (texto vazio)'); continue; }

      const { typing, message } = H.delaysHumanos(texto);
      await H.enviarWhatsapp(chaveConversa, texto, typing, message);

      historico.push({ role: 'assistant', content: texto, t: Date.now() });
      await H.salvarConversa(chaveConversa, historico, H.primeiroNomeDe(nome));
      // Grava pela chave da conversa, nao pela canonica: salvarLead ja
      // canonicaliza pra achar a linha, e assim o numero cru nao se perde.
      await H.salvarLead(chaveConversa, Object.assign(
        { followup_enviado_em: agora.toISOString() },
        H.normalizarCrm(crm) || {}
      ));
      enviados.push({ phone, nome: lead.nome || null, texto });
    } catch (e) {
      console.error('[followup] erro no lead', phone, e);
      pulados.push(phone + ' (erro)');
    }
  }

  if (enviados.length) {
    const linhas = enviados.map((e) => '- ' + (e.nome ? e.nome + ' ' : '') + e.phone + ': ' + e.texto);
    await H.notificarAdmin(
      'Retomei ' + enviados.length + ' conversa(s) que estavam paradas ha 2 dias:\n' + linhas.join('\n') +
      '\n\nCada uma dessas so recebe isso uma vez, nao vou insistir.'
    );
  }

  return res.status(200).json({
    ok: true,
    horaBrasilia: hora,
    analisados: leads.length,
    enviados: enviados.length,
    pulados,
  });
};
