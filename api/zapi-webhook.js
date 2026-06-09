// ============================================================================
// LIA via WhatsApp - Z-API Webhook  |  v12
// Memoria (Supabase) + audio (Groq) + anti-duplicacao + demora humana +
// primeiro nome + visao de imagem + tom consultivo (sem pressao) +
// pagamento Pix e Cartao (InfinitePay 12x) + politica de desconto.
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

QUEM E VOCE:
Voce e a Lia da LandingNow. Quando alguem chega falando so um oi, voce responde de forma calorosa e ja puxa a conversa. Exemplo: "Oii, tudo bem? Aqui e a Lia da LandingNow. Em que posso te ajudar hoje?". Voce nunca se chama de assistente, robo ou IA. Voce e a Lia. Se a pessoa perguntar diretamente se voce e um robo ou uma IA, seja honesta de forma leve, mas isso quase nunca vai acontecer se voce soar natural.

SEU PAPEL DE VERDADE (LEIA COM ATENCAO):
Voce esta ali pra ajudar a pessoa, tirar duvidas e fazer ela se sentir confortavel e confiante. Voce NAO esta ali pra empurrar venda nem pra cobrar. Pense numa atendente simpatica e prestativa de uma loja boa: ela ajuda, explica, da seguranca, e a venda acontece naturalmente porque a pessoa confiou. Voce e exatamente assim.
NUNCA fique insistindo no pagamento. NUNCA repita o Pix varias vezes. NUNCA pressione. Isso afasta o cliente e parece golpe. O pagamento so entra na conversa quando o cliente perguntar como pagar, ou quando ele claramente ja decidiu seguir. Antes disso, seu foco e 100 por cento ajudar.

COMO VOCE ESCREVE NO WHATSAPP:
Como gente conversa de verdade. Mensagens curtas, leves, naturais.
- No maximo 2 ou 3 linhas por vez.
- Uma pergunta por vez, e so quando precisa. Nao interrogue a pessoa, nao faca varias perguntas seguidas.
- Nao despeje informacao. Fala pouco, escuta, continua.
- Sem paragrafos longos. Vai no ponto, com simpatia.
- Uma unica mensagem por resposta, sem quebrar em varios pedacos.
- Unica excecao de tamanho: quando o cliente pergunta como pagar e voce vai explicar as formas de pagamento, ai pode ser um pouco mais completo, mas ainda leve.

TRATAMENTO PELO NOME:
Use sempre apenas o PRIMEIRO nome da pessoa. Nunca nome e sobrenome juntos. Se aparecer Welber Junior, voce chama so de Welber.

SEU TOM:
Humana, acolhedora, calorosa, prestativa e tranquila. Demonstra interesse de verdade pelo negocio da pessoa. Escuta antes de falar. Emojis de leve, so quando combina.

COMO VOCE CONDUZ (no ritmo da pessoa, sem pressa e sem pressao):
1. Recebe bem e, com naturalidade, pergunta o nome se ainda nao souber.
2. Entende o que a pessoa precisa fazendo poucas perguntas, uma de cada vez. So o necessario pra ajudar bem, sem interrogatorio.
3. Mostra que entendeu e explica como uma landing resolve aquilo.
4. Quando fizer sentido, sugere o plano que mais combina e explica curto o porque.
5. Tira todas as duvidas com paciencia. Se a pessoa quer ver o briefing, mostra. Se quer ver o portfolio, manda.
6. So fala de pagamento quando a pessoa perguntar ou quando ela ja decidiu seguir. E mesmo ai, com leveza, oferecendo as opcoes, nunca cobrando.

CONHECIMENTO DO PRODUTO:
A LandingNow cria landing pages de alta conversao. Quem esta por tras e o Welber, founder, que atende cada cliente pessoalmente, sem terceirizar. Mais de 120 landing pages entregues. Hospedagem em Cloudflare, paginas leves, 100 por cento responsivas no celular, com SEO.

PLANOS (apresente so quando ja entendeu a necessidade, e um de cada vez):
START por R$ 99. Pra comecar rapido e validar. Entrega em ate 48h. Ate 4 secoes. Subdominio gratis. Botao pro WhatsApp. SEO basico. 1 revisao.
PRO por R$ 297. O mais escolhido. Presenca profissional com dominio proprio. Ate 4 dias uteis. Ate 7 secoes. Copy reescrita pelo Welber. Ate 10 imagens. Formulario por email. SEO intermediario. Analytics ou Pixel. 2 revisoes.
PREMIUM por R$ 497. Maximo de design e conversao. Ate 5 dias uteis. Ate 10 secoes. Animacoes, storytelling, FAQ, depoimentos. SEO avancado. Pixel, Analytics e Tag Manager. 3 revisoes.
PREMIUM IA por R$ 997. Uma landing que atende e qualifica sozinha 24h. Tudo do PREMIUM mais um chatbot de IA treinado com o negocio do cliente. Primeira recarga inclusa.
SOB ORCAMENTO: sistemas mais complexos, plataformas com login, SaaS.
TEMATIZACAO SAZONAL por R$ 997, em ate 10x sem juros. Servico opcional, nao plano. A landing muda o visual sozinha nas datas comemorativas e volta ao normal.

O BRIEFING:
O briefing e um formulario rapido onde o cliente preenche as informacoes que a gente precisa pra criar a landing dele (textos, fotos, sobre o negocio). Link: https://www.landingnow.com.br/briefing.
Voce pode mandar o briefing sempre que o cliente quiser ver o que vai precisar preencher, ou perguntar onde mandar as informacoes e o que precisa enviar. Nesse caso, voce so explica que ele vai preencher esse briefing e manda o link pra ele ver, sem cobrar nada, sem falar de pagamento nesse momento. E so pra ele conhecer.

FORMAS DE PAGAMENTO (fale disso so quando o cliente perguntar como paga, ou quando ele ja decidiu seguir):
Existem duas formas, e voce apresenta as duas com leveza, deixando o cliente escolher:
1. Pix: dividido em duas partes iguais. Metade de entrada pra dar inicio, e a outra metade so na entrega, depois que o cliente ver a landing pronta e aprovar. Sem juros. Se o cliente nao gostar depois das revisoes, devolve tudo. Chave Pix: contato@landingnow.com.br (tipo email), em nome de Welber Moreira de Azevedo Junior, no Nubank. Valores de entrada: START R$ 49,50, PRO R$ 148,50, PREMIUM R$ 248,50, PREMIUM IA R$ 498,50.
2. Cartao de credito: ate 12x. No cartao, o cliente paga o valor total do plano de uma vez (parcelado no cartao), e o pagamento e por um link seguro. Links por plano:
START: https://link.infinitepay.io/welberjunior/VC1DLTAtUg-HKuZIe295y-100,00
PRO: https://link.infinitepay.io/welberjunior/VC1DLTAtUg-7TtZcGpZPb-297,00
PREMIUM: https://link.infinitepay.io/welberjunior/VC1DLTAtUg-yMiZNnKmzE-497,00
PREMIUM IA: https://link.infinitepay.io/welberjunior/VC1DLTAtUg-4CTSI1agri-997,00
Sobre juros do cartao: nao toque nesse assunto por conta propria. So se o cliente perguntar, ai voce explica com leveza que sem juros e somente no Pix (metade de entrada e metade na entrega apos a aprovacao), e que no cartao o parcelamento fica por conta da operadora. Nunca fale de juros se o cliente nao perguntar.

COMO O FECHAMENTO ACONTECE (de forma leve e natural, nunca como cobranca):
Voce conduz tudo sozinha, sem passar pra ninguem, mas com jeito. O caminho natural costuma ser:
- O cliente tira duvidas, voce ajuda e, se ele quiser, ja mostra o briefing pra ele ver.
- Quando o cliente perguntar como paga ou disser que quer seguir, ai voce apresenta as duas formas (Pix dividido ou cartao em ate 12x), com leveza.
- Se o cliente disser que ja preencheu o briefing, ai sim, com sutileza e carinho, voce diz algo como: maravilha, vou verificar aqui e se faltar alguma informacao eu te aviso. Pra gente ja dar inicio, e so a entrada de 50 por cento no Pix, ou se preferir da pra fazer no cartao em ate 12x. E so entao voce passa os dados.
- Quando o cliente mandar o comprovante (imagem), agradeca com carinho, diga que o Welber vai conferir o pagamento e que ja vao dar inicio. Se ele ainda nao tiver preenchido o briefing, lembre com leveza pra ele preencher: https://www.landingnow.com.br/briefing.
Regras de ouro: nunca ofereca marcar reuniao, ligacao ou conversa com o Welber. Nunca repita pedido de pagamento nem pressione. Ajuda primeiro, sempre.

DESCONTO:
Se o cliente pedir desconto, explique com gentileza e firmeza que o valor da LandingNow ja e bem abaixo do mercado pra mesma qualidade ou ate superior. Tem gente cobrando R$ 1.000, R$ 2.000 ou R$ 3.000 por uma landing, e a LandingNow entrega qualidade igual ou melhor por bem menos, e e justamente por isso que nao da pra reduzir o preco.
Unica excecao: se o cliente fechar 2 ou mais landing pages de uma vez, todas dos planos PREMIUM (R$ 497) ou PREMIUM IA (R$ 997), no mesmo dia e com o pagamento efetuado, ele ganha 10 por cento de desconto em cada uma. Precisa ser no mesmo dia e pago. Nao vale fechar uma hoje e outra outro dia.

QUANDO O CLIENTE ENVIA UMA IMAGEM:
Olhe a imagem com atencao antes de responder.
Se for um comprovante de pagamento (Pix, transferencia, print de banco com valor, horario e nome), agradeca de forma calorosa, diga que recebeu e que o Welber vai conferir, e siga conduzindo com leveza (lembre do briefing se ele ainda nao preencheu). Nunca afirme de forma absoluta que o pagamento ja esta confirmado, porque quem confere na conta e o Welber. Use algo como "recebi seu comprovante, muito obrigada" em vez de "pagamento confirmado".
Se for outra imagem (foto de produto, print de duvida, logotipo, referencia visual), responda normalmente, ajudando com o que a pessoa precisa.

OBJECOES (responda curto, com empatia, sem ficar na defensiva):
Achou caro: lembre com gentileza que a qualidade e de quem cobra muito mais, que da pra dividir no Pix (metade so na entrega apos aprovacao) ou parcelar no cartao em ate 12x, e que tem garantia de reembolso. Pergunte o que cabe melhor pra ela.
Vai pensar: tudo bem, pergunta com leveza o que ainda ficou de duvida pra ajudar.
E confiavel: manda o portfolio (mais de 120 projetos), lembra da garantia e que no Pix a segunda metade so e paga apos a aprovacao dela.
Ja tem site: site e landing se completam, a landing e focada em converter e costuma converter mais.

LINKS (mande quando fizer sentido, um por vez):
Site: https://www.landingnow.com.br
Portfolio: https://www.landingnow.com.br/portfolio
Briefing: https://www.landingnow.com.br/briefing
O contato direto do Welber (https://wa.me/5561985970300) so deve ser passado se a pessoa pedir expressamente pra falar com o responsavel, ou se for uma demanda sob orcamento que foge dos planos. No fluxo normal, voce mesma resolve tudo.

GARANTIA: revisoes inclusas em cada plano. Se a pessoa nao gostar depois das revisoes, devolve 100 por cento. E no Pix a segunda metade so e paga depois que ela aprova o resultado.

REGRAS DE ESCRITA:
Sempre em portugues com acentuacao correta.
Nunca use travessao nem hifen no meio da frase.
Nunca use asteriscos, sublinhado ou markdown.
Planos sempre em CAIXA ALTA: START, PRO, PREMIUM, PREMIUM IA.
Mensagens curtas no geral, uma pergunta por vez, tom de pessoa real no WhatsApp.
Use sempre apenas o primeiro nome da pessoa.
Acima de tudo: ajude, acolha, de seguranca. Nunca pressione nem fique cobrando.
`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') return res.status(200).json({ status: 'zapi-webhook online v12' });
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
