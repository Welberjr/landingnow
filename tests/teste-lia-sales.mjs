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
const EXEMPLO_SERRA = 'https://serra-arquitetura-landingnow.welber-especialistad.chatgpt.site';
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
  assert.ok(msg.includes(EXEMPLO_SERRA));
  assert.match(msg, /SERRA Arquitetura.*demonstrativo.*fictício/);
  assert.equal(msg.split(EXEMPLO_SERRA).length - 1, 1);
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

for (const abertura of [[], ['Olá'], ['Olá', 'Ok']]) {
  reset();
  for (const mensagem of abertura) await evento(mensagem);
  textoIA = 'Podemos apresentar seus projetos e facilitar os pedidos de orçamento.';
  await evento('Sou arquiteta');
  ok('Declaracao recebe SERRA depois de ' + (abertura.join(' / ') || 'nenhuma abertura'), () => {
    const resposta = recebidas().at(-1).message;
    assert.ok(resposta.includes(EXEMPLO_SERRA));
    assert.match(resposta, /SERRA Arquitetura.*demonstrativo.*fictício/);
    assert.doesNotMatch(resposta, /Aqui é a Lia/);
    assert.equal(resposta.split(EXEMPLO_SERRA).length - 1, 1);
    assert.equal(H.exemploArquiteturaJaEnviado(conversas.get(TEL).mensagens), true);
  });
}

reset();
textoIA = 'O PRO inclui até cinco seções e três revisões.';
await evento('Sou arquiteta. Quantas revisões estão incluídas?');
ok('Exemplo complementa a resposta especifica sem substituir a duvida', () => {
  assert.equal(chamadasIA.length, 1);
  assert.ok(recebidas()[0].message.startsWith(textoIA));
  assert.ok(recebidas()[0].message.includes(EXEMPLO_SERRA));
});
textoIA = 'Você tem três revisões. Veja novamente: ' + EXEMPLO_SERRA + '\nOutro link: ' + EXEMPLO_SERRA;
await evento('Sou arquiteta e queria confirmar as revisões');
ok('Repeticao gerada pela IA tambem nao reenvia o link', () => {
  assert.match(recebidas()[1].message, /três revisões/);
  assert.ok(!recebidas()[1].message.includes(EXEMPLO_SERRA));
  assert.equal(recebidas().filter(m => m.message.includes(EXEMPLO_SERRA)).length, 1);
  assert.doesNotMatch(recebidas()[1].message, /Veja novamente:|Outro link:/);
});
textoIA = 'Claro, veja este exemplo: ' + EXEMPLO_SERRA;
await evento('Pode enviar o link de novo?');
ok('Reenvio explicitamente solicitado recupera exemplo e contexto anterior', () => {
  const resposta = recebidas().at(-1).message;
  assert.ok(resposta.includes(EXEMPLO_SERRA));
  assert.equal(resposta.split(EXEMPLO_SERRA).length - 1, 1);
  assert.match(resposta, /demonstrativo.*fictício/);
});

reset();
conversas.set(TEL, { phone: TEL, mensagens: [
  { role: 'user', content: 'Sou arquiteta' }, { role: 'assistant', content: 'Posso esclarecer suas dúvidas sobre a página.' },
] });
textoIA = 'Veja este exemplo: ' + EXEMPLO_SERRA;
await evento('Me manda um exemplo');
ok('Pedido de exemplo usa profissao ja declarada no historico', () => {
  assert.ok(recebidas()[0].message.includes(EXEMPLO_SERRA));
  assert.match(recebidas()[0].message, /demonstrativo.*fictício/);
});

reset();
conversas.set(TEL, { phone: TEL, mensagens: [
  { role: 'user', content: 'Sou arquiteta' }, { role: 'assistant', content: 'Entendi.' },
  { role: 'user', content: 'Não sou arquiteta, escrevi errado' },
] });
textoIA = 'O PRO inclui três revisões. Veja este exemplo: ' + EXEMPLO_SERRA;
await evento('Me manda um exemplo');
ok('Correcao de nicho no historico impede exemplo errado sem apagar resposta', () => {
  assert.equal(recebidas()[0].message, 'O PRO inclui três revisões.');
});

reset();
conversas.set(TEL, { phone: TEL, mensagens: [
  { role: 'user', content: 'Não sou arquiteta, sou professora.', externalAdReply: ad },
  { role: 'assistant', content: 'Podemos apresentar suas aulas.' },
] });
textoIA = 'Podemos apresentar suas aulas. Veja este exemplo: ' + EXEMPLO_SERRA;
await evento('Quero uma página para minhas aulas');
ok('Negativa anterior continua prevalecendo sobre anuncio persistido', () => {
  assert.equal(recebidas()[0].message, 'Podemos apresentar suas aulas.');
  assert.equal(H.contextoDeArquitetura('Quero uma página para minhas aulas', ad, conversas.get(TEL).mensagens), false);
});
ok('Oferta inicial tambem respeita correcao anterior de nicho', () => {
  const resposta = H.respostaInicialComercial({ mensagemCliente: 'Olá', referral: ad,
    historico: [{ role: 'user', content: 'Não sou arquiteta, sou professora.' }] });
  assert.match(resposta, /seu negócio/);
  assert.ok(!resposta.includes(EXEMPLO_SERRA));
});

for (const negativa of ['Não sou arquiteta', 'Não sou uma arquiteta', 'Não trabalho com arquitetura', 'Não atuo em arquitetura']) {
  reset(); textoIA = 'Entendi a correção. Podemos apresentar seu negócio. ' + EXEMPLO_SERRA;
  await evento(negativa, { externalAdReply: ad });
  ok('Negativa prevalece sobre anuncio e link gerado: ' + negativa, () => {
    assert.ok(!recebidas()[0].message.includes(EXEMPLO_SERRA));
    assert.equal(H.exemploArquiteturaJaEnviado(conversas.get(TEL).mensagens), false);
  });
}

reset();
conversas.set(TEL, { phone: TEL, mensagens: [{ role: 'user', content: EXEMPLO_SERRA }] });
await evento('Sou arquiteta');
ok('Link mencionado pelo usuario nao conta como envio anterior', () => assert.ok(recebidas()[0].message.includes(EXEMPLO_SERRA)));

reset();
conversas.set(TEL, { phone: TEL, mensagens: [{ role: 'assistant', content: 'Veja https://renata-collodetti-arquitetura.pages.dev' }] });
textoIA = 'O PRO tem três revisões. ' + EXEMPLO_SERRA;
await evento('Sou arquiteta. Quantas revisões tenho?');
ok('Exemplo de arquitetura anterior evita nova oferta automatica', () => {
  assert.match(recebidas()[0].message, /três revisões/);
  assert.ok(!recebidas()[0].message.includes(EXEMPLO_SERRA));
});

reset();
const historicoLongo = [{ role: 'assistant', content: EXEMPLO_SERRA, t: 1 },
  ...Array.from({ length: 45 }, (_, i) => ({ role: 'user', content: 'Dúvida ' + i, t: i + 2 }))];
await H.salvarConversa(TEL, historicoLongo, null);
ok('Retencao de 40 mensagens preserva envio ja aceito', () => {
  const salvas = conversas.get(TEL).mensagens;
  assert.equal(salvas.length, 40);
  assert.equal(salvas.some(m => m.content.includes(EXEMPLO_SERRA)), false);
  assert.equal(H.exemploArquiteturaJaEnviado(salvas), true);
});
textoIA = 'O PRO tem três revisões. ' + EXEMPLO_SERRA;
await evento('Sou arquiteta. Quantas revisões tenho?');
ok('Conversa longa nao recebe o exemplo novamente', () => assert.ok(!recebidas()[0].message.includes(EXEMPLO_SERRA)));

for (const caso of [
  { texto: 'Sou arquiteta, pare de enviar mensagens', pausa: 'pedido-do-cliente' },
  { texto: 'Sou arquiteta, não quero informações', pausa: 'pedido-do-cliente' },
  { texto: 'Sou arquiteta, quero falar com uma pessoa responsável', pausa: 'atendimento-humano' },
  { texto: 'Sou arquiteta e o site que vocês fizeram não está abrindo', pausa: 'pos-venda' },
  { texto: 'Sou arquiteta', cliente: true, pausa: 'pos-venda' },
]) {
  reset();
  if (caso.cliente) leads.set(CANON, { phone: CANON, estagio: 'cliente' });
  const resultado = await evento(caso.texto);
  ok('Trava prevalece sobre exemplo: ' + caso.texto + (caso.cliente ? ' / cliente' : ''), () => {
    assert.equal(resultado.body.paused, caso.pausa);
    assert.equal(chamadasIA.length, 0);
    assert.equal(recebidas().some(m => m.message.includes(EXEMPLO_SERRA)), false);
  });
}

reset();
conversas.set('ctrl:' + CANON, { phone: 'ctrl:' + CANON, nome_cliente: 'paused' });
await evento('Sou arquiteta');
ok('Conversa pausada nao recebe exemplo', () => { assert.equal(recebidas().length, 0); assert.equal(chamadasIA.length, 0); });

reset(); textoIA = 'Vou encaminhar a dúvida à equipe. [[AVISAR_WELBER: Avaliar pedido de integração.]]';
await evento('Sou arquiteta. Fazem integração com meu sistema?');
ok('Aviso humano da IA impede o complemento comercial', () => {
  assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
  assert.ok(!recebidas()[0].message.includes(EXEMPLO_SERRA));
});

reset(); textoIA = '<analysis>Planejamento interno</analysis>';
await evento('Sou arquiteta. Quantas revisões estão incluídas?');
ok('Guard de resposta insegura impede o exemplo', () => {
  assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
  assert.ok(!recebidas()[0].message.includes(EXEMPLO_SERRA));
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
  { nome: 'exemplo arquitetura', mensagem: 'Sou arquiteta', resposta: 'Podemos apresentar seus projetos.' },
]) {
  reset(); falharEnvio = true; textoIA = caso.resposta || 'Resposta local';
  const entrada = { messageId: 'falha-' + caso.nome };
  const falhaTotal = await evento(caso.mensagem, entrada);
  ok('503 total observavel no fluxo ' + caso.nome, () => {
    assert.equal(falhaTotal.status, 503); assert.equal(falhaTotal.body.ok, false);
    assert.equal(enviadas.length, 0);
    assert.equal(conversas.get('ctrl:' + CANON).nome_cliente, 'paused');
    assert.equal(conversas.get(TEL).mensagens.filter(m => m.role === 'assistant').length, 0);
    assert.equal(H.exemploArquiteturaJaEnviado(conversas.get(TEL).mensagens), false);
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
    if (caso.nome === 'exemplo arquitetura') {
      assert.ok(recebidas()[0].message.includes(EXEMPLO_SERRA));
      assert.equal(H.exemploArquiteturaJaEnviado(conversas.get(TEL).mensagens), true);
    }
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

reset();
aoGerar = async () => conversas.set('ctrl:' + CANON, { phone: 'ctrl:' + CANON, nome_cliente: 'paused' });
const exemploTardio = await evento('Sou arquiteta. Quantas revisões tenho?');
ok('Pausa durante geracao tambem impede exemplo tardio', () => {
  assert.equal(exemploTardio.body.paused, 'late-check');
  assert.equal(recebidas().length, 0);
  assert.equal(H.exemploArquiteturaJaEnviado(conversas.get(TEL).mensagens), false);
});

reset(); falharRegistroAposAceite = 'cliente';
const eventoExemplo = { messageId: 'exemplo-aceite-incerto' };
const exemploIncerto = await evento('Sou arquiteta', eventoExemplo);
ok('Exemplo aceito com falha de registro exige conferencia', () => {
  assert.equal(exemploIncerto.status, 503);
  assert.ok(recebidas()[0].message.includes(EXEMPLO_SERRA));
  assert.equal(H.exemploArquiteturaJaEnviado(conversas.get(TEL).mensagens), false);
});
await evento('Sou arquiteta', eventoExemplo);
ok('Retry nao duplica exemplo de aceite incerto', () => assert.equal(recebidas().length, 1));

const handlerSite = require('../api/lia.js');
async function eventoSite(messages, resposta) {
  textoIA = resposta;
  let saida;
  const res = { setHeader() {}, status(status) { return { json(body) { saida = { status, body }; }, end() {} }; } };
  await handlerSite({ method: 'POST', headers: { 'x-real-ip': 'site-local-' + (++seq) }, body: { messages } }, res);
  assert.equal(saida.status, 200);
  return saida.body;
}
const perguntaSite = 'Sou arquiteta. Quantas revisões estão incluídas?';
const respostaSite = await eventoSite([{ role: 'assistant', content: 'Olá! Aqui é a Lia.' }, { role: 'user', content: perguntaSite }], 'O PRO tem três revisões.');
ok('Chat do site preserva pergunta e acrescenta demonstracao', () => {
  assert.match(respostaSite.reply, /^O PRO tem três revisões/);
  assert.ok(respostaSite.reply.includes(EXEMPLO_SERRA));
  assert.match(respostaSite.reply, /demonstrativo.*fictício/);
});
const repeticaoSite = await eventoSite([{ role: 'assistant', content: respostaSite.reply },
  ...Array.from({ length: 17 }, () => ({ role: 'user', content: 'Quero esclarecer o plano' })),
  { role: 'user', content: perguntaSite }], 'O PRO tem três revisões. ' + EXEMPLO_SERRA);
ok('Site verifica envio anterior alem das 16 mensagens da IA', () => {
  assert.match(repeticaoSite.reply, /três revisões/);
  assert.ok(!repeticaoSite.reply.includes(EXEMPLO_SERRA));
});
for (const mensagem of ['Não sou arquiteta', 'Sou arquiteta, pare de enviar mensagens', 'Sou arquiteta e quero falar com o Welber', 'Sou arquiteta e já sou cliente']) {
  const resposta = await eventoSite([{ role: 'user', content: mensagem }], 'Entendi sua mensagem. ' + EXEMPLO_SERRA);
  ok('Site nao oferece exemplo em negativa ou encaminhamento: ' + mensagem, () => assert.ok(!resposta.reply.includes(EXEMPLO_SERRA)));
}
const reenvioSite = await eventoSite([{ role: 'assistant', content: respostaSite.reply },
  { role: 'user', content: 'Pode enviar o link de novo?' }], 'Veja este exemplo: ' + EXEMPLO_SERRA);
ok('Site permite reenvio solicitado apos exemplo anterior', () => assert.ok(reenvioSite.reply.includes(EXEMPLO_SERRA)));

console.log(`\n${checks} verificações passaram. Nenhum acesso externo.`);
