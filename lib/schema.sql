-- Run this in your Supabase SQL editor to set up the database

-- Enable RLS
alter table if exists clients enable row level security;
alter table if exists directors enable row level security;
alter table if exists documents enable row level security;

-- CLIENTS table
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company_name text not null,
  cin text not null,
  registered_office text not null,
  financial_year_end text not null default 'March 31',
  authorised_capital text,
  paid_up_capital text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- DIRECTORS table
create table if not exists directors (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  name text not null,
  din text not null,
  designation text not null default 'Director',
  email text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

-- DOCUMENTS table
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'board_minutes',
  title text not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now() not null
);

-- RLS POLICIES

-- Clients: users can only see their own clients
create policy "Users can view own clients" on clients
  for select using (auth.uid() = user_id);
create policy "Users can insert own clients" on clients
  for insert with check (auth.uid() = user_id);
create policy "Users can update own clients" on clients
  for update using (auth.uid() = user_id);
create policy "Users can delete own clients" on clients
  for delete using (auth.uid() = user_id);

-- Directors: users can manage directors of their clients
create policy "Users can view own directors" on directors
  for select using (
    exists (select 1 from clients where clients.id = directors.client_id and clients.user_id = auth.uid())
  );
create policy "Users can insert own directors" on directors
  for insert with check (
    exists (select 1 from clients where clients.id = directors.client_id and clients.user_id = auth.uid())
  );
create policy "Users can update own directors" on directors
  for update using (
    exists (select 1 from clients where clients.id = directors.client_id and clients.user_id = auth.uid())
  );
create policy "Users can delete own directors" on directors
  for delete using (
    exists (select 1 from clients where clients.id = directors.client_id and clients.user_id = auth.uid())
  );

-- Documents: users can only see their own documents
create policy "Users can view own documents" on documents
  for select using (auth.uid() = user_id);
create policy "Users can insert own documents" on documents
  for insert with check (auth.uid() = user_id);
create policy "Users can update own documents" on documents
  for update using (auth.uid() = user_id);
create policy "Users can delete own documents" on documents
  for delete using (auth.uid() = user_id);

-- INDEXES for performance
create index if not exists clients_user_id_idx on clients(user_id);
create index if not exists directors_client_id_idx on directors(client_id);
create index if not exists documents_client_id_idx on documents(client_id);
create index if not exists documents_user_id_idx on documents(user_id);
create index if not exists documents_created_at_idx on documents(created_at desc);


create table if not exists generation_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  doc_type text not null,
  model_used text,
  tokens_used integer,
  created_at timestamptz default now() not null
);

alter table generation_usage enable row level security;

create policy "Users can view own usage" on generation_usage
  for select using (auth.uid() = user_id);

create policy "Users can insert own usage" on generation_usage
  for insert with check (auth.uid() = user_id);

create index if not exists generation_usage_user_doc_idx
  on generation_usage(user_id, doc_type);

-- Index for fast rate-limit queries (user + time range)
create index if not exists generation_usage_user_created_idx
  on generation_usage(user_id, created_at desc);