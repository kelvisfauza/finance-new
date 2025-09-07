-- Supabase Bootstrap for Great Pearl Finance
create extension if not exists pgcrypto;

create table if not exists public.finance_prices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  coffee_type text not null,
  grade text,
  base_price numeric,
  differential numeric default 0,
  notes text,
  created_by uuid references auth.users(id)
);

create table if not exists public.finance_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  reference text,
  supplier text,
  supplier_code text,
  amount numeric not null,
  method text check (method in ('Bank','Mobile Money','Cash')) default 'Bank',
  status text check (status in ('Pending','Approved','Rejected')) default 'Pending',
  notes text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz
);

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  reference text,
  category text,
  payee text,
  amount numeric not null,
  status text check (status in ('Pending','Approved','Rejected')) default 'Pending',
  notes text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz
);

create table if not exists public.finance_ledgers (
  id uuid primary key default gen_random_uuid(),
  date timestamptz default now(),
  ref text,
  type text,
  debit numeric,
  credit numeric,
  balance numeric
);

alter table public.finance_prices enable row level security;
alter table public.finance_payments enable row level security;
alter table public.finance_expenses enable row level security;
alter table public.finance_ledgers enable row level security;

create policy "auth read"   on public.finance_prices   for select using (auth.role() = 'authenticated');
create policy "auth write"  on public.finance_prices   for insert with check (auth.role() = 'authenticated');
create policy "auth update" on public.finance_prices   for update using (auth.role() = 'authenticated');

create policy "auth read"   on public.finance_payments for select using (auth.role() = 'authenticated');
create policy "auth write"  on public.finance_payments for insert with check (auth.role() = 'authenticated');
create policy "auth update" on public.finance_payments for update using (auth.role() = 'authenticated');

create policy "auth read"   on public.finance_expenses for select using (auth.role() = 'authenticated');
create policy "auth write"  on public.finance_expenses for insert with check (auth.role() = 'authenticated');
create policy "auth update" on public.finance_expenses for update using (auth.role() = 'authenticated');

create policy "auth read"   on public.finance_ledgers  for select using (auth.role() = 'authenticated');
create policy "auth write"  on public.finance_ledgers  for insert with check (auth.role() = 'authenticated');
create policy "auth update" on public.finance_ledgers  for update using (auth.role() = 'authenticated');