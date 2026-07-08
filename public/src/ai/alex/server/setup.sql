-- ═══════════════════════════════════════════════════
-- Alex de ADDBOX v5.0 — Setup completo de Supabase
-- Ejecutar en SQL Editor de Supabase
-- ═══════════════════════════════════════════════════

-- Extensión para vectores (embeddings)
create extension if not exists vector;

-- ─────────────────────────────────────────
-- 1. Contexto conversacional
-- ─────────────────────────────────────────
create table if not exists alex_context (
  id bigint generated always as identity primary key,
  user_id text not null,
  role text default 'user',
  message text not null,
  created_at timestamptz default now()
);

create index if not exists idx_alex_ctx_user
  on alex_context(user_id, created_at desc);

-- ─────────────────────────────────────────
-- 2. Feedback
-- ─────────────────────────────────────────
create table if not exists alex_feedback (
  id bigint generated always as identity primary key,
  user_id text not null default 'anon',
  message_id text,
  value int not null,
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_alex_fb_date
  on alex_feedback(created_at desc);

-- ─────────────────────────────────────────
-- 3. Documentos RAG (con embeddings)
-- ─────────────────────────────────────────
create table if not exists alex_docs (
  id bigint generated always as identity primary key,
  content text not null,
  metadata jsonb default '{}',
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- 4. Acciones ejecutadas por Alex (auditoría)
-- ─────────────────────────────────────────
create table if not exists alex_acciones (
  id bigint generated always as identity primary key,
  user_id text not null,
  tipo text not null,
  detalles jsonb default '{}',
  ejecutado_por text default 'alex',
  created_at timestamptz default now()
);

create index if not exists idx_alex_acciones_user
  on alex_acciones(user_id, created_at desc);

-- ─────────────────────────────────────────
-- 5. Funciones RPC para búsqueda
-- ─────────────────────────────────────────

-- Búsqueda por texto (fallback)
create or replace function match_docs(query_text text)
returns table(id bigint, content text, similarity float)
language plpgsql as $$
begin
  return query
    select d.id, d.content, 0.0::float as similarity
    from alex_docs d
    where d.content ilike '%' || query_text || '%'
    limit 5;
end;
$$;

-- Búsqueda vectorial (embeddings)
create or replace function match_docs_vector(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count int default 3
)
returns table(id bigint, content text, similarity float)
language plpgsql as $$
begin
  return query
    select
      d.id,
      d.content,
      1 - (d.embedding <=> query_embedding) as similarity
    from alex_docs d
    where d.embedding is not null
      and 1 - (d.embedding <=> query_embedding) > match_threshold
    order by d.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- ─────────────────────────────────────────
-- 6. RLS (Row Level Security)
-- ─────────────────────────────────────────
alter table alex_context enable row level security;
alter table alex_feedback enable row level security;
alter table alex_docs enable row level security;
alter table alex_acciones enable row level security;

-- Políticas permisivas (ajustar según necesidad)
create policy "Allow all on alex_context" on alex_context for all using (true) with check (true);
create policy "Allow all on alex_feedback" on alex_feedback for all using (true) with check (true);
create policy "Allow all on alex_docs" on alex_docs for all using (true) with check (true);
create policy "Allow all on alex_acciones" on alex_acciones for all using (true) with check (true);

-- ─────────────────────────────────────────
-- 7. Limpieza automática (ejecutar con pg_cron)
-- ─────────────────────────────────────────
-- delete from alex_context where created_at < now() - interval '30 days';
