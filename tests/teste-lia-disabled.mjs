import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const routes = ['api/zapi-webhook.js', 'api/lia-followup.js', 'api/lia.js'];
const forbidden = (name) => () => {
  throw new Error(`A rota aposentada tentou usar ${name}`);
};

for (const route of routes) {
  test(`${route}: reconhece chamadas antigas sem dependencias ou efeitos`, async () => {
    const source = readFileSync(new URL(`../${route}`, import.meta.url), 'utf8');
    const module = { exports: {} };
    const context = {
      module,
      exports: module.exports,
      require: forbidden('require'),
      fetch: forbidden('fetch'),
      setTimeout: forbidden('setTimeout'),
      setInterval: forbidden('setInterval'),
      console: new Proxy({}, { get: forbidden('console') }),
      process: new Proxy({}, { get: forbidden('process/ambiente') }),
    };
    vm.runInNewContext(source, context, { filename: route, timeout: 1000 });
    assert.equal(typeof module.exports, 'function');

    // Nenhum campo do evento, corpo, token ou query pode disparar o codigo antigo.
    const request = new Proxy({}, { get: forbidden('dados da requisicao') });
    const response = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await module.exports(request, response);

    assert.equal(response.statusCode, 200, 'deve reconhecer o evento sem pedir retentativa');
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.equal(response.body.disabled, true);
    assert.equal(response.body.service, 'lia-landingnow');
  });
}

test('Vercel nao agenda mais o follow-up da Lia', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal((config.crons || []).some((cron) => cron.path === '/api/lia-followup'), false);
});
