-- Multi-level approval system
-- 1. room_approvers: defines the approval chain for each room
-- 2. booking_approval_steps: tracks approval progress for each booking

-- Table: room_approvers
-- Each room can have 0..N approvers with a defined order (step_order)
create table room_approvers (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  step_order int not null default 1,
  label text, -- e.g. "空間管理人", "系主任"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, step_order),
  unique(room_id, user_id)
);

alter table room_approvers enable row level security;

create policy "room_approvers_select" on room_approvers for select using (true);
create policy "room_approvers_admin" on room_approvers for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Table: booking_approval_steps
-- When a booking is created for a room with approvers, 
-- one row per approver step is inserted. Each step is pending until acted upon.
create table booking_approval_steps (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null,
  step_order int not null,
  approver_id uuid references profiles(id) on delete cascade not null,
  label text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'skipped')),
  decided_at timestamp with time zone,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(booking_id, step_order)
);

alter table booking_approval_steps enable row level security;

-- Approvers can see steps assigned to them
create policy "approval_steps_select_approver" on booking_approval_steps 
  for select using (
    approver_id = auth.uid() 
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Users can see their own booking's approval steps
create policy "approval_steps_select_user" on booking_approval_steps 
  for select using (
    exists (
      select 1 from bookings 
      where bookings.id = booking_approval_steps.booking_id 
      and bookings.user_id = auth.uid()
    )
  );

-- Only admins and the assigned approver can update
create policy "approval_steps_update" on booking_approval_steps 
  for update using (
    approver_id = auth.uid()
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Only admins can insert (done via server action when booking is created)
create policy "approval_steps_insert" on booking_approval_steps 
  for insert with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
    or exists (
      select 1 from bookings 
      where bookings.id = booking_approval_steps.booking_id 
      and bookings.user_id = auth.uid()
    )
  );

-- Index for quick lookup
create index idx_booking_approval_steps_booking on booking_approval_steps(booking_id);
create index idx_booking_approval_steps_approver on booking_approval_steps(approver_id);
create index idx_room_approvers_room on room_approvers(room_id);
create index idx_room_approvers_user on room_approvers(user_id);
