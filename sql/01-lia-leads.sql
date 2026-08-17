-- ===========================================================================
-- CRM da LIA: tabela lia_leads
-- Rodar no SQL Editor do Supabase (projeto hubxacojvgoepowsgbas).
-- Rodar DEPOIS de SUPABASE_SERVICE_KEY estar na Vercel e o deploy ter subido,
-- porque a partir daqui quem escreve nessa tabela e a chave de servico.
-- ===========================================================================

create table if not exists public.lia_leads (
  phone               text primary key,   -- forma canonica, sem o nono digito
  chave_conversa      text,               -- numero cru como o Z-API entrega
  nome                text,
  nicho               text,
  estagio             text        not null default 'novo',
  plano_ofertado      text,
  valor_ofertado      numeric,
  objecao             text,
  motivo              text,
  proximo_passo       text,
  origem              text,
  eh_cliente          boolean     not null default false,
  despedida_em        timestamptz,
  followup_enviado_em timestamptz,
  ultima_mensagem_em  timestamptz,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

comment on table public.lia_leads is 'CRM preenchido sozinho pela LIA a cada resposta';

-- Estagios validos. Se a LIA inventar outro, o codigo ja descarta antes de
-- gravar; isso aqui e a segunda barreira.
alter table public.lia_leads drop constraint if exists lia_leads_estagio_ck;
alter table public.lia_leads add constraint lia_leads_estagio_ck
  check (estagio in ('novo','qualificando','proposta','negociando','ganho','perdido','cliente','suporte'));

-- Indice da busca do follow-up: quem esta parado e ainda nao foi retomado.
create index if not exists lia_leads_frios_idx
  on public.lia_leads (ultima_mensagem_em)
  where followup_enviado_em is null;

-- Quem pode ver o CRM pelo painel. Coloque aqui os e-mails de login do painel.
create table if not exists public.lia_admins (
  email text primary key
);

-- TROQUE pelos e-mails de verdade do painel (o teu e o do Caio) antes de rodar.
insert into public.lia_admins (email) values
  ('welber.especialistadigital@gmail.com')
  on conflict (email) do nothing;

-- Fechado por padrao: so a chave de servico (webhook e cron) escreve e le tudo.
-- A chave publica nao encosta. O painel le pelo login, e so quem estiver em
-- lia_admins.
alter table public.lia_leads  enable row level security;
alter table public.lia_admins enable row level security;

revoke all on public.lia_leads  from anon;
revoke all on public.lia_admins from anon;
revoke all on public.lia_leads  from authenticated;
revoke all on public.lia_admins from authenticated;

grant select on public.lia_leads to authenticated;

drop policy if exists "socios leem o crm" on public.lia_leads;
create policy "socios leem o crm" on public.lia_leads
  for select to authenticated
  using (exists (select 1 from public.lia_admins a where a.email = auth.jwt() ->> 'email'));
