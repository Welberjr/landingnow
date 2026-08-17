-- ===========================================================================
-- Kanban do CRM: deixar o socio arrastar o card e mudar o estagio do lead.
-- Rodar no SQL Editor do Supabase (projeto hubxacojvgoepowsgbas), depois do
-- 01-lia-leads.sql.
--
-- A liberacao e a MENOR possivel de proposito: so as duas colunas que o
-- arrasto escreve, e so pra quem esta em lia_admins. Nome, telefone, valor,
-- objecao e o resto da ficha continuam trancados, porque quem preenche
-- aquilo e a LIA. E o estagio ainda passa pelo check da tabela, entao nao da
-- pra gravar um valor inventado nem de propósito.
-- ===========================================================================

grant update (estagio, atualizado_em) on public.lia_leads to authenticated;

drop policy if exists "socios movem o card" on public.lia_leads;
create policy "socios movem o card" on public.lia_leads
  for update to authenticated
  using      (exists (select 1 from public.lia_admins a where a.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.lia_admins a where a.email = auth.jwt() ->> 'email'));

-- Conferencia: a chave publica continua sem escrever nada.
--   curl -X PATCH "https://hubxacojvgoepowsgbas.supabase.co/rest/v1/lia_leads?phone=eq.1" \
--     -H "apikey: CHAVE_PUBLICA" -H "Content-Type: application/json" -d '{"estagio":"ganho"}'
-- Resposta esperada: 401.
