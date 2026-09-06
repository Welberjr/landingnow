// Integracao local: todas as requisicoes sao interceptadas. Nenhum envio real.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
Object.assign(process.env, {
  SUPABASE_URL: 'https://lia-sales.invalid', SUPABASE_SERVICE_KEY: 'teste-local',
  ANTHROPIC_API_KEY: 'teste-local', ZAPI_INSTANCE_ID: 'teste-local',
  ZAPI_INSTANCE_TOKEN: 'teste-local', ZAPI_CLIENT_TOKEN: 'teste-local',
  LIA_ATIVA_DESDE: '2020-01-01', ADMIN_PHONES: '', ADMIN_LIDS: '',
});
const conversas = new Map(), leads = new Map(), processados = new Set();
const enviadas = [], chamadasIA = [];
let textoIA, falharEnvio, aoGerar, falharRegistroAposAceite, falhasGravacaoConversa = 0, seq = 0;
const json = (data, status = 200) => ({ ok: status < 300, status, json: async () => structuredClone(data), text: async () => JSON.stringify(data) });
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  const corpo = options.body ? JSON.parse(options.body) : null;
  if (url.hostname === 'lia-sales.invalid') {
    const tabela = url.pathname.split('/').pop();
    if (tabela === 'lia_processados') {
      if (options.method === 'POST') {
        const existe = processados.has(corpo.message_id);
        processados.add(corpo.message_id);
        return json(existe ? [] : [corpo]);
      }
      return json(processados.has(url.searchParams.get('message_id')?.slice(3)) ? [{ message_id: 'existente' }] : []);
    }
    const mapa = tabela === 'lia_conversas' ? conversas : tabela === 'lia_leads' ? leads : null;
    assert.ok(mapa, 'Tabela esperada no fake');
    if (options.method === 'POST') {
      if (tabela === 'lia_conversas' && falhasGravacaoConversa > 0) {
        falhasGravacaoConversa--;
        return json({ error: 'falha de persistencia simulada' }, 503);
      }
      for (const row of Array.isArray(corpo) ? corpo : [corpo]) mapa.set(row.phone, { ...mapa.get(row.phone), ...row });
      return json([]);
    }
    return json([...mapa.values()].filter(row => [...url.searchParams].every(([key, value]) => {
      if (['select', 'order', 'limit'].includes(key)) return true;
      if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
      if (value.startsWith('in.')) return value.slice(4, -1).split(',').map(x => x.replaceAll('"', '')).includes(String(row[key]));
      throw new Error('Filtro nao coberto: ' + key + '=' + value);
    })));
  }
  if (url.hostname === 'api.anthropic.com') {
    chamadasIA.push(corpo);
    if (aoGerar) await aoGerar();
    return json({ content: [{ type: 'text', text: textoIA }] });
  }
  if (url.hostname === 'api.z-api.io' && url.pathname.endsWith('/send-text')) {
    if (falharEnvio === true || (falharEnvio === 'cliente' && corpo.phone === TEL) || (falharEnvio === 'admin' && corpo.phone !== TEL)) return json({ messageId: 'id-recusado' }, 503);
    enviadas.push(corpo);
    if ((falharRegistroAposAceite === 'cliente' && corpo.phone === TEL) || (falharRegistroAposAceite === 'admin' && corpo.phone !== TEL)) {
      falhasGravacaoConversa = 1;
      falharRegistroAposAceite = null;
    }
    return json({ messageId: 'local-' + (++seq) });
  }
  throw new Error('Acesso externo bloqueado pelo teste: ' + url.hostname);
};
const require = createRequire(import.meta.url);
const handler = require('../api/zapi-webhook.js');
const H = handler.helpers;
const TEL = '5511987654321', CANON = H.canonicalBR(TEL);
const reset = () => { conversas.clear(); leads.clear(); processados.clear(); enviadas.length = 0; chamadasIA.length = 0; textoIA = 'Resposta local.'; falharEnvio = false; aoGerar = null; falharRegistroAposAceite = null; falhasGravacaoConversa = 0; };
const recebidas = () => enviadas.filter(e => e.phone === TEL);
async function evento(message, extra = {}) {
  let saida;
  const res = { setHeader() {}, status(status) { return { json(body) { saida = { status, body }; }, end() { saida = { status }; } }; } };
  await handler({ method: 'POST', body: { phone: TEL, connectedPhone: '556185970300', momment: Date.now(), messageId: 'teste-' + (++seq), fromMe: false, text: { message }, ...extra } }, res);
  return saida;
}
let checks = 0;
function ok(nome, fn) { fn(); checks++; console.log('OK ' + nome); }

for (const frase of ['Adicionei sem querer, quero informação não', 'Entrei sem querer', 'Errei', 'Não quero informações', 'Não tenho interesse', 'Não quero, obrigada']) {
  reset();
  const r = await evento(frase);
  ok('Encerra sem qualificar: ' + frase, () => {
    assert.equal(r.body.paused, 'pedido-do-cliente');
    assert.equal(chamadasIA.length, 0);
    assert.equal(recebidas().length, 1);
    assert.doesNotMatch(recebidas()[0].message, /\?|497|Instagram/);
    assert.equal(leads.get(CANON).estagio, 'perdido');
    assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
  });
  await evento('Ok');
  ok('Pausa impede novas respostas', () => assert.equal(recebidas().length, 1));
}
ok('Nao encerra duvida, correcao de valor ou recusa de um recurso', () => {
  for (const frase of ['Errei o valor, é 497?', 'Uma landing page para minha loja', 'Não quero informações sobre IA, quero o PRO', 'Quero fazer um site', 'Enviei comprovante por engano, vou mandar o certo', 'Mandei a foto sem querer', 'Adicionei uma seção sem querer', 'Entrei no site sem querer, como volto?', 'Não cliquei sem querer, tenho interesse', 'Cliquei no anúncio sem querer, mas gostei e quero contratar']) assert.equal(H.classificarDesinteresse(frase).encerrar, false, frase);
});
reset();
await evento('Enviei comprovante por engano, vou mandar o certo');
ok('Correcao de arquivo segue atendimento e nao vira perdido', () => {
  assert.equal(chamadasIA.length, 1);
  assert.notEqual(leads.get(CANON)?.estagio, 'perdido');
  assert.equal(conversas.has('ctrl:' + CANON), false);
});

const ad = { title: 'Landing page para arquitetura', body: 'PRO por R$497', sourceType: 'ad', sourceId: '123', sourceUrl: 'https://facebook.com/123', ctwaClid: 'id-do-clique', campoInventado: 'nao salvar' };
reset();
await evento('Olá, posso ter informações?', { senderName: '🏛️ Studio 123', externalAdReply: ad });
ok('Oferta inicial com contexto real e sem nome de empresa', () => {
  assert.equal(chamadasIA.length, 0);
  const msg = recebidas()[0].message;
  assert.match(msg, /R\$ 497/); assert.match(msg, /50% na entrada e 50% após aprovação/);
  assert.match(msg, /48 horas após a entrada e o envio completo dos materiais/);
  assert.match(msg, /renata-collodetti-arquitetura/);
  assert.doesNotMatch(msg, /Studio|você é arquiteto|sua arquitetura/);
  assert.equal(leads.get(CANON).origem, 'anuncio-arquitetura');
  assert.equal(leads.get(CANON).nicho, undefined);
  assert.equal(leads.get(CANON).estagio, 'proposta');
  const ref = conversas.get(TEL).mensagens[0].externalAdReply;
  assert.equal(ref.sourceId, '123'); assert.equal(ref.ctwaClid, 'id-do-clique'); assert.equal(ref.campoInventado, undefined);
});
textoIA = 'O PRO inclui até cinco seções e três revisões.';
await evento('O que está incluso?');
ok('Referencia continua no contexto sem repetir a abertura', () => {
  assert.equal(chamadasIA.length, 1);
  assert.match(chamadasIA[0].system, /REFERENCIA DO ANUNCIO RECEBIDA/);
  assert.match(chamadasIA[0].system, /nao confirma a profissao/);
  assert.doesNotMatch(recebidas()[1].message, /Aqui é a Lia/);
});

reset();
await evento('Olá! Tenho interesse e queria mais informações, por favor.');
ok('Entrada sem origem recebe oferta neutra', () => {
  assert.equal(chamadasIA.length, 0);
  assert.match(recebidas()[0].message, /seu negócio/);
  assert.doesNotMatch(recebidas()[0].message, /arquitetura/);
  assert.equal(leads.get(CANON).origem, 'whatsapp');
  assert.equal(H.extrairReferenciaAnuncio({ referral: ad }), null);
});
ok('Nomes apenas plausiveis e opcionais', () => {
  assert.equal(H.primeiroNomeDe('Miguel Souza'), 'Miguel');
  for (const nome of ['5511987654321', 'Studio ABC', 'JJS Arquitetura', 'Miguel 📞', 'Name', 'Filha', 'Filho', 'Mãe', 'Pai', 'Mamãe', 'Papai', 'Amorzinho']) assert.equal(H.primeiroNomeDe(nome), null);
  assert.doesNotMatch(H.SYSTEM_PROMPT, /Use sempre apenas/);
});

for (const texto of [
  'Miguel nunca respondeu. Vou tratar como caso especial e enviar o followup. Oi, Miguel!',
  '<analysis>Vou preparar a resposta</analysis> Olá!',
  'Tudo certo [[CRM: estagio=ganho',
  'CRM: estagio=ganho; nome=Miguel',
  '[LEAD_PRONTO]{"nome":"Contato"',
  'Vou analisar o contexto do cliente e formular uma resposta.',
  'É rapidinho! Eles já te atendem.',
]) {
  reset(); textoIA = texto;
  await evento('Você pode explicar como funciona o projeto?');
  ok('Retem resposta indevida: ' + texto.slice(0, 25), () => {
    assert.equal(H.respostaPublicaSegura(texto).bloqueada, true);
    assert.doesNotMatch(recebidas()[0].message, /nunca respondeu|caso especial|<analysis>|\[\[|CRM:|rapidinho/);
    assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
    assert.ok(enviadas.some(e => /Resposta automatica retida/.test(e.message)));
  });
}
ok('Guard permite resposta comercial normal e reuniao orientada pela equipe', () => {
  assert.equal(H.respostaPublicaSegura('O PRO tem três revisões.').bloqueada, false);
  assert.equal(H.respostaPublicaSegura('Eles estão em reunião e retornam assim que estiverem disponíveis.').bloqueada, false);
  assert.equal(H.respostaPublicaSegura('Não garantimos vendas. O resultado depende também do anúncio e do atendimento.').bloqueada, false);
  assert.equal(H.respostaPublicaSegura('Nunca garanto vendas.').bloqueada, false);
  assert.equal(H.respostaPublicaSegura('Não te garanto vendas.').bloqueada, false);
  assert.equal(H.respostaPublicaSegura('Garantimos vendas para seu negócio.').bloqueada, true);
});
ok('Negacao de pedido humano nao provoca encaminhamento', () => assert.equal(H.pedeAtendimentoHumano('Não quero falar com um atendente, quero continuar com você'), false));

reset();
await evento('Quero falar com uma pessoa responsável');
await evento('Alguém pode me atender?');
ok('Encaminhamento humano real preserva a pausa', () => {
  assert.equal(chamadasIA.length, 0); assert.equal(recebidas().length, 1);
  assert.match(recebidas()[0].message, /estão em reunião/);
  assert.doesNotMatch(recebidas()[0].message, /rapidinho/);
  assert.ok(enviadas.some(e => /Atendimento humano solicitado/.test(e.message)));
});

reset(); textoIA = 'Vou encaminhar esse pedido à equipe. [[AVISAR_WELBER: Avaliar integração solicitada.]] [[CRM: estagio=negociando]]';
await evento('Podem fazer um sistema com integração ao meu ERP?');
ok('Avaliacao fora do escopo pausa para continuidade humana', () => {
  assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
  assert.doesNotMatch(recebidas()[0].message, /AVISAR|CRM/);
});

reset(); textoIA = 'Recebi a informação; o Welber vai conferir o pagamento. [[CRM: estagio=ganho; plano=PRO; valor=497; motivo=pagou]] [[AVISAR_WELBER: Fechou! Cliente informou pagamento do PRO.]]';
await evento('Fiz o pagamento do PRO');
ok('Declaracao de pagamento nao registra venda confirmada', () => {
  assert.equal(leads.get(CANON).estagio, 'negociando');
  assert.notEqual(leads.get(CANON).eh_cliente, true);
  assert.ok(enviadas.some(e => /Pagamento pendente de conferência/.test(e.message)));
  assert.ok(!enviadas.some(e => /Fechou!/.test(e.message)));
});
ok('Cliente confirmado permanece reconhecido', () => assert.equal(H.normalizarCrm({ estagio: 'ganho' }, { eh_cliente: true }).eh_cliente, true));

reset();
aoGerar = async () => conversas.set('ctrl:' + CANON, { phone: 'ctrl:' + CANON, nome_cliente: 'paused' });
const tardia = await evento('Quais recursos a página inclui?');
ok('Pausa durante geracao impede envio tardio', () => { assert.equal(tardia.body.paused, 'late-check'); assert.equal(enviadas.length, 0); });
reset(); falharEnvio = true;
const falhou = await H.enviarWhatsapp(TEL, 'Teste local');
ok('HTTP recusado nao conta como envio nem registra eco', () => { assert.equal(falhou, null); assert.equal(processados.has('id-recusado'), false); });
const avisoFalhou = await H.notificarAdmin('Aviso local');
ok('notificarAdmin devolve falha real', () => assert.equal(avisoFalhou, false));

for (const caso of [
  { nome: 'guard', mensagem: 'Quais recursos a página inclui?', resposta: '<analysis>Texto interno</analysis>' },
  { nome: 'humano', mensagem: 'Quero falar com uma pessoa responsável' },
  { nome: 'pos-venda', mensagem: 'O site que vocês fizeram não está abrindo' },
  { nome: 'resposta normal', mensagem: 'Quais recursos a página inclui?', resposta: 'O PRO inclui até cinco seções e três revisões.' },
]) {
  reset(); falharEnvio = true; textoIA = caso.resposta || 'Resposta local';
  const entrada = { messageId: 'falha-' + caso.nome };
  const falhaTotal = await evento(caso.mensagem, entrada);
  ok('503 total observavel no fluxo ' + caso.nome, () => {
    assert.equal(falhaTotal.status, 503); assert.equal(falhaTotal.body.ok, false);
    assert.equal(enviadas.length, 0);
    assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
    assert.equal(conversas.get(TEL).mensagens.filter(m => m.role === 'assistant').length, 0);
    assert.match(leads.get(CANON).proximo_passo, /Falha de envio/);
    assert.equal(conversas.get(TEL).mensagens.find(m => m.entrega)?.entrega.estado, 'pendente');
  });
  falharEnvio = false;
  const antesIA = chamadasIA.length;
  const recuperada = await evento(caso.mensagem, entrada);
  ok('Retry do mesmo messageId recupera somente entrega ' + caso.nome, () => {
    assert.equal(recuperada.status, 200); assert.equal(recuperada.body.recuperacao, true);
    assert.equal(chamadasIA.length, antesIA);
    assert.equal(recebidas().length, 1);
    assert.equal(conversas.get(TEL).mensagens.filter(m => m.role === 'user').length, 1);
    assert.equal(conversas.get(TEL).mensagens.filter(m => m.role === 'assistant').length, 1);
    assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
  });
  const quantidade = enviadas.length;
  await evento(caso.mensagem, entrada);
  ok('Replay concluido nao duplica entrega ' + caso.nome, () => assert.equal(enviadas.length, quantidade));
}

for (const falhaEm of ['cliente', 'admin']) {
  reset(); falharEnvio = falhaEm;
  const inicial = await evento('Quero falar com um responsável');
  ok('Falha parcial preserva aceite individual: ' + falhaEm, () => {
    assert.equal(inicial.status, 503);
    assert.equal(recebidas().length, falhaEm === 'cliente' ? 0 : 1);
    assert.equal(conversas.get(TEL).mensagens.filter(m => m.role === 'assistant').length, falhaEm === 'cliente' ? 0 : 1);
    if (falhaEm === 'cliente') assert.ok(enviadas.some(e => /resposta ao contato FALHOU/.test(e.message)));
  });
  falharEnvio = false;
  const proxima = await evento('Oi, alguém está aí?');
  ok('Proxima mensagem recupera sem duplicar destinos aceitos: ' + falhaEm, () => {
    assert.equal(proxima.body.recuperacao, true); assert.equal(proxima.body.ok, true);
    assert.equal(recebidas().length, 1);
    assert.equal(enviadas.filter(e => e.phone !== TEL).length, 1);
    assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
  });
}

reset(); falharEnvio = true;
await evento('Quero falar com um responsável');
falharEnvio = false;
await evento('Não quero informações');
ok('Recusa cancela acolhida pendente e mantem perdido', () => {
  assert.equal(recebidas().length, 0); assert.equal(leads.get(CANON).estagio, 'perdido');
  assert.ok(enviadas.some(e => /Nao retomar contato/.test(e.message)));
});

reset(); falharEnvio = true;
await evento('Quero falar com um responsável');
falharEnvio = false;
await evento('Aqui é o Welber, vou atender você', { fromMe: true });
await evento('Obrigado');
ok('Humano assumir cancela a resposta automatica pendente', () => assert.equal(recebidas().length, 0));

reset(); falharEnvio = true;
for (let i = 0; i < 4; i++) await evento('Quero falar com um responsável', { messageId: 'limite-entrega' });
const limite = conversas.get(TEL).mensagens.find(m => m.entrega).entrega;
ok('Recuperacao limita tentativas sem declarar sucesso', () => {
  assert.equal(limite.tentativas, 3); assert.equal(limite.estado, 'pendente');
  assert.match(leads.get(CANON).proximo_passo, /tentativa 3\/3/);
});

for (const destino of ['cliente', 'admin']) {
  reset(); falharRegistroAposAceite = destino;
  const eventoOrigem = { messageId: 'persistencia-' + destino };
  const primeira = await evento('Quero falar com um responsável', eventoOrigem);
  const quantidadeAntes = enviadas.filter(e => destino === 'cliente' ? e.phone === TEL : e.phone !== TEL).length;
  ok('Aceite com falha posterior de persistencia e sinalizado: ' + destino, () => {
    assert.equal(primeira.status, 503);
    assert.match(primeira.body.entrega.error, /aceito-registro-falhou/);
    const entrega = conversas.get(TEL).mensagens.find(m => m.entrega).entrega;
    assert.equal(destino === 'cliente' ? entrega.resposta.estado : entrega.avisos[0].estado, 'enviando');
    assert.equal(quantidadeAntes, 1);
  });
  const retomada = await evento('Quero falar com um responsável', eventoOrigem);
  ok('Aceite incerto exige conferencia e nao duplica ' + destino, () => {
    assert.equal(retomada.status, 503);
    assert.equal(retomada.body.entrega.aceiteIncerto, true);
    assert.equal(enviadas.filter(e => destino === 'cliente' ? e.phone === TEL : e.phone !== TEL).length, quantidadeAntes);
    assert.match(leads.get(CANON).proximo_passo, /Aceite de envio incerto/);
    assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
  });
}

reset(); falharEnvio = true;
await evento('Quero falar com um responsável');
falharEnvio = false;
const audioRecuperacao = await evento('', { audio: { audioUrl: 'https://midia.invalid/audio.ogg' } });
ok('Audio novo durante pendencia cancela acolhida e preserva contexto humano', () => {
  assert.equal(audioRecuperacao.body.recuperacao, true);
  assert.equal(recebidas().length, 0);
  assert.ok(conversas.get(TEL).mensagens.some(m => /audio; encaminhar para escuta humana/.test(m.content)));
  assert.ok(enviadas.some(e => /Novo audio recebido/.test(e.message)));
});

console.log(`\n${checks} verificações passaram. Nenhum acesso externo.`);
