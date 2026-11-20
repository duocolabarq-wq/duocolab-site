-- =========================================================
-- Duo Colab · Portal do cliente · esquema do banco (Supabase)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =========================================================

-- Equipe da Duo: quem está aqui pode ver e editar todos os projetos (/admin).
create table if not exists equipe (
  email text primary key,
  nome  text not null
);

create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  titulo text not null,
  cliente text not null,                 -- como o portal cumprimenta: "Olá, Gustavo e Rafaely"
  subtitulo text default '',
  servico text default '',
  status text default 'Em andamento',
  capa_url text default '',
  vistorias_feitas int default 0,
  vistorias_contratadas int default 0,
  vistorias_texto text default '',
  observacao_documentos text default 'Os arquivos foram enviados pelo grupo do WhatsApp. Peça à equipe se precisar de algum novamente.',
  arquivado boolean default false,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Quem (por e-mail) pode abrir cada projeto no portal.
create table if not exists acessos (
  projeto_id uuid references projetos on delete cascade,
  email text not null,
  primary key (projeto_id, email)
);

create table if not exists etapas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  ordem int not null default 0,
  nome text not null,
  status text not null default 'pend' check (status in ('ok','and','pend')),
  periodo text default '',
  itens text[] default '{}'
);

create table if not exists marcos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  ordem int not null default 0,
  valor text not null,
  rotulo text not null,
  proximo boolean default false
);

create table if not exists decisoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  ordem int not null default 0,
  titulo text not null,
  descricao text default '',
  prazo text default '',
  status text not null default 'aberta' check (status in ('aberta','aprovada','ajuste','resolvida')),
  resposta text default '',
  respondido_por text default '',
  respondido_em timestamptz,
  lida_pela_equipe boolean default true
);

create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  titulo text not null,
  data date,
  url text default ''
);

create table if not exists reunioes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  ordem int not null default 0,
  titulo text not null,
  descricao text default '',
  data text default ''
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  ordem int not null default 0,
  tipo text default 'LINK',
  titulo text not null,
  url text not null
);

create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  categoria text not null,
  item text not null,
  fornecedor text default '',
  status text not null default 'pend' check (status in ('ok','and','pend'))
);

create table if not exists ambientes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  ordem int not null default 0,
  titulo text not null,
  imagem_url text not null
);

create table if not exists pessoas_projeto (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  ordem int not null default 0,
  nome text not null,
  papel text default ''
);

-- ---------- Funções de permissão ----------
create or replace function meu_email() returns text language sql stable as
$$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function sou_equipe() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from equipe where lower(email) = meu_email()) $$;

create or replace function vejo_projeto(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select sou_equipe() or exists (select 1 from acessos where projeto_id = p and lower(email) = meu_email()) $$;

-- Antes de mandar o link de login: o e-mail está cadastrado em algum projeto ou na equipe?
create or replace function email_autorizado(e text) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from equipe where lower(email) = lower(trim(e)))
       or exists (select 1 from acessos a join projetos p on p.id = a.projeto_id
                  where lower(a.email) = lower(trim(e)) and not p.arquivado) $$;
grant execute on function email_autorizado(text) to anon, authenticated;

-- O cliente responde uma decisão (aprovar ou pedir ajuste). Só mexe nos campos de resposta.
create or replace function responder_decisao(d uuid, acao text, comentario text) returns void
language plpgsql security definer set search_path = public as $$
declare p uuid;
begin
  select projeto_id into p from decisoes where id = d;
  if p is null or not vejo_projeto(p) then raise exception 'sem permissão'; end if;
  if acao not in ('aprovada','ajuste','aberta') then raise exception 'ação inválida'; end if;
  update decisoes set status = acao, resposta = coalesce(comentario,''),
    respondido_por = meu_email(), respondido_em = case when acao = 'aberta' then null else now() end,
    lida_pela_equipe = (acao = 'aberta')
  where id = d;
end $$;
grant execute on function responder_decisao(uuid, text, text) to authenticated;

-- ---------- Segurança por linha (RLS) ----------
do $$
declare t text;
begin
  foreach t in array array['etapas','marcos','decisoes','documentos','reunioes','links','compras','ambientes','pessoas_projeto','acessos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists ler on %I', t);
    execute format('drop policy if exists equipe_edita on %I', t);
    execute format('create policy ler on %I for select to authenticated using (vejo_projeto(projeto_id))', t);
    execute format('create policy equipe_edita on %I for all to authenticated using (sou_equipe()) with check (sou_equipe())', t);
  end loop;
end $$;

alter table projetos enable row level security;
drop policy if exists ler on projetos;
drop policy if exists equipe_edita on projetos;
create policy ler on projetos for select to authenticated using (vejo_projeto(id));
create policy equipe_edita on projetos for all to authenticated using (sou_equipe()) with check (sou_equipe());

alter table equipe enable row level security;
drop policy if exists ler on equipe;
create policy ler on equipe for select to authenticated using (sou_equipe());

-- ---------- Arquivos (capas e imagens dos ambientes) ----------
insert into storage.buckets (id, name, public) values ('projetos', 'projetos', true)
  on conflict (id) do nothing;
drop policy if exists equipe_sobe on storage.objects;
create policy equipe_sobe on storage.objects for all to authenticated
  using (bucket_id = 'projetos' and sou_equipe()) with check (bucket_id = 'projetos' and sou_equipe());

-- =========================================================
-- Documentos do projeto (guias, andamento, cadernos, conferências, painel interno)
-- Cada documento é uma página HTML com seus arquivos (imagens, scripts), guardada
-- no bucket privado "documentos" em <projeto_id>/<documento_id>/...
-- O portal mostra o documento dentro de um quadro isolado (iframe sandbox).
-- =========================================================
create table if not exists documentos_projeto (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos on delete cascade,
  tipo text not null check (tipo in ('andamento','guia','etapas','perspectivas','marcenaria','conferencia','painel')),
  titulo text not null,
  subtitulo text default '',
  versao text default '',
  data date,
  so_equipe boolean not null default false,   -- true = só a equipe vê (ex.: painel interno)
  ordem int not null default 0,
  origem text default '',                     -- de onde veio (ex.: link do artefato no Claude), só para a equipe
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);
create index if not exists documentos_projeto_projeto on documentos_projeto (projeto_id);

-- Painel interno é sempre só da equipe.
create or replace function painel_so_equipe() returns trigger language plpgsql as $$
begin
  if new.tipo = 'painel' then new.so_equipe := true; end if;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists painel_so_equipe on documentos_projeto;
create trigger painel_so_equipe before insert or update on documentos_projeto
  for each row execute function painel_so_equipe();

create or replace function vejo_documento(d uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from documentos_projeto x where x.id = d and vejo_projeto(x.projeto_id) and (not x.so_equipe or sou_equipe())) $$;

alter table documentos_projeto enable row level security;
drop policy if exists ler on documentos_projeto;
drop policy if exists equipe_edita on documentos_projeto;
create policy ler on documentos_projeto for select to authenticated
  using (vejo_projeto(projeto_id) and (not so_equipe or sou_equipe()));
create policy equipe_edita on documentos_projeto for all to authenticated
  using (sou_equipe()) with check (sou_equipe());

-- O que as pessoas marcam dentro de um documento (tarefas do painel, respostas do cliente,
-- registros de visita). Substitui o armazenamento que os documentos tinham no Claude.
create table if not exists documento_dados (
  documento_id uuid not null references documentos_projeto on delete cascade,
  colecao text not null,
  chave text not null,
  dados jsonb not null default '{}'::jsonb,
  autor uuid default auth.uid(),
  autor_nome text default '',
  atualizado_em timestamptz default now(),
  primary key (documento_id, colecao, chave)
);
alter table documento_dados enable row level security;
drop policy if exists ler on documento_dados;
drop policy if exists equipe_edita on documento_dados;
drop policy if exists cliente_proprio on documento_dados;
create policy ler on documento_dados for select to authenticated using (vejo_documento(documento_id));
create policy equipe_edita on documento_dados for all to authenticated
  using (sou_equipe() and vejo_documento(documento_id)) with check (sou_equipe() and vejo_documento(documento_id));
-- O cliente só grava registros dele mesmo: a chave termina com "_<id do usuário>".
create policy cliente_proprio on documento_dados for all to authenticated
  using (vejo_documento(documento_id) and chave like '%\_' || auth.uid()::text)
  with check (vejo_documento(documento_id) and chave like '%\_' || auth.uid()::text and autor = auth.uid());

-- Bucket privado dos documentos: a equipe envia; a leitura passa pelo servidor do site.
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false)
  on conflict (id) do nothing;
drop policy if exists equipe_documentos on storage.objects;
create policy equipe_documentos on storage.objects for all to authenticated
  using (bucket_id = 'documentos' and sou_equipe()) with check (bucket_id = 'documentos' and sou_equipe());
