-- ===========================================================================
-- Joga todo mundo que JA COMPROU pra coluna Ganho do kanban.
-- A fonte da verdade e a tabela briefings: so existe briefing de quem fechou.
-- Rodar no SQL Editor do Supabase (hubxacojvgoepowsgbas), depois do 01.
--
-- Pode rodar mais de uma vez sem medo: quem ja esta la e atualizado, nao
-- duplicado. E como marca eh_cliente, a LIA para de oferecer plano pra essas
-- pessoas na hora, que era o problema do cliente que so queria um ajuste.
-- ===========================================================================

-- Mesma regra de telefone do codigo: tira o que nao e numero, poe o 55 se
-- faltar e remove o nono digito, porque o WhatsApp entrega o numero das contas
-- antigas sem ele. Some sozinha no fim da sessao.
create or replace function pg_temp.canon(t text) returns text as $$
declare n text;
begin
  n := regexp_replace(coalesce(t, ''), '\D', '', 'g');
  if length(n) in (10, 11) then n := '55' || n; end if;
  if n ~ '^55[0-9]{2}9[0-9]{8}$' then n := substr(n, 1, 4) || substr(n, 6); end if;
  return n;
end
$$ language plpgsql;

insert into public.lia_leads
  (phone, chave_conversa, nome, nicho, estagio, plano_ofertado, valor_ofertado,
   eh_cliente, origem, motivo, ultima_mensagem_em)
select distinct on (pg_temp.canon(b.whatsapp))
  pg_temp.canon(b.whatsapp),
  regexp_replace(coalesce(b.whatsapp, ''), '\D', '', 'g'),
  nullif(split_part(trim(coalesce(b.nome_responsavel, b.nome_negocio, '')), ' ', 1), ''),
  nullif(trim(coalesce(b.nicho, '')), ''),
  'ganho',
  case lower(replace(coalesce(b.plano, ''), ' ', ''))
    when 'start'     then 'START'
    when 'pro'       then 'PRO'
    when 'premium'   then 'PREMIUM'
    when 'premiumia' then 'PREMIUM IA'
    else null
  end,
  case lower(replace(coalesce(b.plano, ''), ' ', ''))
    when 'start'     then 297
    when 'pro'       then 497
    when 'premium'   then 997
    when 'premiumia' then 1497
    else null
  end,
  true,
  'briefing',
  'ja e cliente, veio do briefing',
  b.created_at
from public.briefings b
where pg_temp.canon(b.whatsapp) <> ''
  and length(pg_temp.canon(b.whatsapp)) >= 10
order by pg_temp.canon(b.whatsapp), b.created_at desc
on conflict (phone) do update set
  estagio       = 'ganho',
  eh_cliente    = true,
  nome          = coalesce(public.lia_leads.nome, excluded.nome),
  nicho         = coalesce(public.lia_leads.nicho, excluded.nicho),
  origem        = coalesce(public.lia_leads.origem, excluded.origem),
  motivo        = 'ja e cliente, veio do briefing',
  atualizado_em = now();

-- Confere quantos entraram:
select estagio, count(*) from public.lia_leads group by estagio order by 2 desc;
