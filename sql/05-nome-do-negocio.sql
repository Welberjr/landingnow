-- ===========================================================================
-- Nome do negocio na ficha do lead.
-- Motivo: quatro clientes entraram no CRM como "Erick", cada um com um
-- telefone diferente. E a revenda: uma pessoa preenche o briefing pelos
-- clientes dela e poe o proprio nome no campo de responsavel. No quadro isso
-- vira quatro cards iguais e ninguem sabe quem e quem.
-- Rodar no SQL Editor do Supabase (hubxacojvgoepowsgbas), depois do 04.
-- ===========================================================================

alter table public.lia_leads add column if not exists negocio text;

create or replace function pg_temp.canon(t text) returns text as $$
declare n text;
begin
  n := regexp_replace(coalesce(t, ''), '\D', '', 'g');
  if length(n) in (10, 11) then n := '55' || n; end if;
  if n ~ '^55[0-9]{2}9[0-9]{8}$' then n := substr(n, 1, 4) || substr(n, 6); end if;
  return n;
end
$$ language plpgsql;

-- So preenche onde esta vazio: o que a LIA escrever depois manda mais que o
-- briefing antigo.
update public.lia_leads l
   set negocio = b.nome_negocio,
       atualizado_em = now()
  from (
    select distinct on (pg_temp.canon(whatsapp))
           pg_temp.canon(whatsapp) as ph,
           nome_negocio,
           created_at
      from public.briefings
     where coalesce(whatsapp, '') <> ''
     order by pg_temp.canon(whatsapp), created_at desc
  ) b
 where l.phone = b.ph
   and coalesce(b.nome_negocio, '') <> ''
   and l.negocio is null;

-- Confere como ficou:
select negocio, nome, estagio, plano_ofertado from public.lia_leads order by atualizado_em desc;
