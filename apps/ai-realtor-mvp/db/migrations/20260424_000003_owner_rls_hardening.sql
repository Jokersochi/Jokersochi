-- Harden owner-scoped access for properties.
-- This keeps service_role access for automations while restricting authenticated users.

drop policy if exists "owner read properties" on properties;
drop policy if exists "owner write properties" on properties;

create policy "owner read properties scoped"
on properties
for select
using (
  auth.role() = 'service_role'
  or (auth.role() = 'authenticated' and owner_id = auth.uid())
);

create policy "owner write properties scoped"
on properties
for all
using (
  auth.role() = 'service_role'
  or (auth.role() = 'authenticated' and owner_id = auth.uid())
)
with check (
  auth.role() = 'service_role'
  or (auth.role() = 'authenticated' and owner_id = auth.uid())
);
