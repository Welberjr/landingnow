// Respostas simuladas: nenhum acesso a IA, WhatsApp ou dados reais.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.ANTHROPIC_API_KEY = 'teste-local';
let respostaModelo = '';
globalThis.fetch = async (input) => {
  assert.equal(String(input), 'https://api.anthropic.com/v1/messages');
  return { ok: true, json: async () => ({ content: [{ text: respostaModelo }] }) };
};
const handler = createRequire(import.meta.url)('../api/lia.js');
let caso = 0;
async function responder(texto) {
  respostaModelo = texto;
  let resultado;
  const res = {
    setHeader() {},
    status(status) { return { json(body) { resultado = { status, body }; }, end() {} }; },
  };
  await handler({ method: 'POST', headers: { 'x-real-ip': 'teste-' + (++caso) }, body: { messages: [{ role: 'user', content: 'Quero falar com o Welber sobre meu site.' }] } }, res);
  assert.equal(resultado.status, 200);
  return resultado.body;
}

const bloqueada = await responder('Vou tratar o cliente como um caso especial e formular a resposta.');
assert.match(bloqueada.reply, /fale com o Welber pelo WhatsApp/);
assert.doesNotMatch(bloqueada.reply, /vou (?:pedir|encaminhar)|reunião|caso especial/i);
assert.equal(bloqueada.waLink, 'https://wa.me/5561985970300');
assert.equal(bloqueada.lead, null);

const truncada = await responder('Vou preparar o resumo. [LEAD_PRONTO]{"nome":"Cliente Teste","nicho":"arquitetura"');
assert.doesNotMatch(truncada.reply, /LEAD_PRONTO|Cliente Teste/);
assert.equal(truncada.waLink, 'https://wa.me/5561985970300');
assert.equal(truncada.lead, null);

const lead = await responder('Você pode falar com o Welber pelo botão. [LEAD_PRONTO]{"nome":"Cliente Teste","nicho":"arquitetura","plano":"PRO"}[/LEAD_PRONTO]');
assert.equal(lead.lead.nome, 'Cliente Teste');
assert.equal(lead.lead.cidade, '');
assert.equal(lead.lead.urgencia, '');
assert.match(lead.waLink, /^https:\/\/api\.whatsapp\.com\/send\?/);
assert.match(decodeURIComponent(lead.waLink), /arquitetura/);
assert.doesNotMatch(lead.reply, /LEAD_PRONTO/);

const segura = await responder('Não garantimos vendas. A página apresenta seus projetos e facilita o contato pelo WhatsApp.');
assert.match(segura.reply, /^Não garantimos vendas/);
assert.equal(segura.waLink, null);

console.log('OK: site oferece encaminhamento real, aceita dados opcionais e preserva resposta comercial honesta.');
