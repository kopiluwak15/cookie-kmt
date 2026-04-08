-- =====================================================================
-- cookie-kmt: Row Level Security ポリシー
--
-- 設計:
--   - 全テーブルに RLS を有効化
--   - service_role（管理API）は常にバイパス
--   - スタッフは auth.users → staff.auth_user_id で認識し、自店舗データのみアクセス
--   - 匿名ユーザー（LIFFカルテ）は customers/karte_intakes への INSERT のみ許可
--   - 公開マスター（stores / menus / ticket_templates）は全員 SELECT 可
-- =====================================================================

-- =============================================
-- ヘルパー: 現在のスタッフレコードを返す
-- =============================================
create or replace function public.current_staff()
returns public.staff
language sql
security definer
stable
as $$
  select * from public.staff
  where auth_user_id = auth.uid()
    and enabled = true
  limit 1;
$$;

create or replace function public.current_staff_store_id()
returns uuid
language sql
security definer
stable
as $$
  select store_id from public.staff
  where auth_user_id = auth.uid()
    and enabled = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select role = 'admin' from public.staff
     where auth_user_id = auth.uid() and enabled = true limit 1),
    false
  );
$$;

-- =============================================
-- RLS 有効化
-- =============================================
alter table public.stores            enable row level security;
alter table public.staff             enable row level security;
alter table public.customers         enable row level security;
alter table public.karte_intakes     enable row level security;
alter table public.menus             enable row level security;
alter table public.visits            enable row level security;
alter table public.visit_menus       enable row level security;
alter table public.judgment_logs     enable row level security;
alter table public.staff_comments    enable row level security;
alter table public.ticket_templates  enable row level security;
alter table public.tickets           enable row level security;

-- =============================================
-- stores: 全員 SELECT 可、admin のみ UPDATE
-- =============================================
create policy stores_select_all on public.stores
  for select using (true);

create policy stores_update_admin on public.stores
  for update using (public.is_admin())
  with check (public.is_admin());

-- =============================================
-- staff: スタッフは自店舗のスタッフを SELECT、自分だけ UPDATE。admin は全操作
-- =============================================
create policy staff_select_same_store on public.staff
  for select using (store_id = public.current_staff_store_id());

create policy staff_update_self on public.staff
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy staff_admin_all on public.staff
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================
-- customers:
--   - 匿名ユーザーは INSERT 可（LIFFカルテからの新規登録）
--   - 自店舗スタッフは全操作可
-- =============================================
create policy customers_insert_anon on public.customers
  for insert
  with check (true);  -- 店舗は固定（kmt）。アプリ側で store_id を seed する。

create policy customers_select_staff on public.customers
  for select using (store_id = public.current_staff_store_id());

create policy customers_update_staff on public.customers
  for update using (store_id = public.current_staff_store_id())
  with check (store_id = public.current_staff_store_id());

create policy customers_delete_admin on public.customers
  for delete using (public.is_admin());

-- =============================================
-- karte_intakes: 匿名 INSERT 可、スタッフ閲覧
-- =============================================
create policy karte_intakes_insert_anon on public.karte_intakes
  for insert with check (true);

create policy karte_intakes_select_staff on public.karte_intakes
  for select using (store_id = public.current_staff_store_id());

-- =============================================
-- menus: 全員 SELECT、admin のみ更新
-- =============================================
create policy menus_select_all on public.menus
  for select using (true);

create policy menus_admin_write on public.menus
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================
-- visits / visit_menus / judgment_logs / staff_comments
-- スタッフは自店舗のみ全操作
-- =============================================
create policy visits_staff_all on public.visits
  for all using (store_id = public.current_staff_store_id())
  with check (store_id = public.current_staff_store_id());

create policy visit_menus_staff_all on public.visit_menus
  for all
  using (
    exists (select 1 from public.visits v where v.id = visit_menus.visit_id and v.store_id = public.current_staff_store_id())
  )
  with check (
    exists (select 1 from public.visits v where v.id = visit_menus.visit_id and v.store_id = public.current_staff_store_id())
  );

create policy judgment_logs_staff_all on public.judgment_logs
  for all using (
    exists (select 1 from public.visits v where v.id = judgment_logs.visit_id and v.store_id = public.current_staff_store_id())
  )
  with check (
    exists (select 1 from public.visits v where v.id = judgment_logs.visit_id and v.store_id = public.current_staff_store_id())
  );

create policy staff_comments_staff_all on public.staff_comments
  for all using (
    exists (select 1 from public.visits v where v.id = staff_comments.visit_id and v.store_id = public.current_staff_store_id())
  )
  with check (
    exists (select 1 from public.visits v where v.id = staff_comments.visit_id and v.store_id = public.current_staff_store_id())
  );

-- =============================================
-- ticket_templates: 全員 SELECT、admin のみ更新
-- =============================================
create policy ticket_templates_select_all on public.ticket_templates
  for select using (true);

create policy ticket_templates_admin_write on public.ticket_templates
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================
-- tickets: スタッフは自店舗のみ全操作
-- =============================================
create policy tickets_staff_all on public.tickets
  for all using (store_id = public.current_staff_store_id())
  with check (store_id = public.current_staff_store_id());
