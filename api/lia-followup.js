// Lia da LandingNow desativada: este endpoint permanece apenas para reconhecer
// chamadas antigas sem consultar dados, chamar IA ou enviar mensagens.
// HTTP 200 evita retentativas do provedor para eventos de atendimento aposentados.
'use strict';

module.exports = async function retiredLiaHandler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    disabled: true,
    service: 'lia-landingnow',
    channel: 'followup',
    message: 'O atendimento automático da Lia foi desativado.',
  });
};
