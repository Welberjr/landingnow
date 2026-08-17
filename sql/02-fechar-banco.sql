-- ===========================================================================
-- FECHAR O BANCO DA LIA
--
-- Motivo: a chave publica do Supabase esta dentro de painel/index.html, que e
-- versionado no repositorio PUBLICO do GitHub. Com ela, qualquer pessoa lia a
-- tabela inteira de conversas: nome, telefone e o papo completo de todo
-- cliente, com preco e tudo. Testado em 16/08/2026, respondia 200 com os dados.
--
-- ORDEM OBRIGATORIA, nao inverta:
--   1. Colocar a chave de servico nas envs da Vercel (Settings > Environment
--      Variables, valor em Supabase > Project Settings > API > service_role,
--      do projeto hubxacojvgoepowsgbas). O codigo aceita o nome
--      SUPABASE_SERVICE_KEY ou SUPABASE_SERVICE_ROLE_KEY, tanto faz.
--   2. Redeploy e conferir que https://landingnow.com.br/api/zapi-webhook
--      responde o healthcheck.
--   3. Rodar o 01-lia-leads.sql.
--   4. So entao rodar ESTE arquivo.
--
-- Se rodar isto antes do passo 1, a LIA para de gravar conversa na hora.
-- ===========================================================================

-- Ninguem de fora encosta nas tabelas da LIA. Quem escreve e le e a chave de
-- servico, que so existe dentro do servidor e nunca sai no HTML.
alter table public.lia_conversas   enable row level security;
alter table public.lia_processados enable row level security;

revoke all on public.lia_conversas   from anon;
revoke all on public.lia_processados from anon;
revoke all on public.lia_conversas   from authenticated;
revoke all on public.lia_processados from authenticated;

revoke all on public.lia_conversas   from public;
revoke all on public.lia_processados from public;
revoke all on public.lia_leads       from public;

-- Conferencia: depois de rodar, isto tem que voltar VAZIO pra chave publica.
-- No terminal:
--   curl -s "https://hubxacojvgoepowsgbas.supabase.co/rest/v1/lia_conversas?select=phone&limit=1" -H "apikey: CHAVE_PUBLICA"
-- Resposta esperada: [] ou erro de permissao. Se vier dado, algo ficou aberto.
