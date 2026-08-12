-- Group conversations: a thread that belongs to one parish group.
--
-- A campaign group needs somewhere to talk that is not the global feed. This
-- adds one nullable column rather than a second posts table, because a group
-- post is the same thing as a public post in every respect except who can
-- see it, and forking the table would fork moderation, reporting, blocking,
-- replies and notifications along with it.
--
-- The visibility rule is the whole point, so it is enforced in the row
-- policy and not only in the route. NEXT_PUBLIC_SUPABASE_ANON_KEY ships
-- inside the client bundle, community_posts already has a public read
-- policy, and RLS is row-scoped: without the change below, every group's
-- posts would be one PostgREST call away from anyone who has the app
-- installed.

alter table public.community_posts
  add column if not exists group_id uuid
  references public.prayer_campaign_groups (id) on delete cascade;

-- The group feed reads one group, newest first.
create index if not exists community_posts_group_idx
  on public.community_posts (group_id, created_at desc)
  where group_id is not null;

-- The public feed now has to skip group posts, so give it its own partial
-- index rather than making it filter the whole table.
create index if not exists community_posts_public_idx
  on public.community_posts (created_at desc)
  where group_id is null and status = 'visible';

-- Membership is asked through public.is_campaign_group_member(), defined in
-- 20260811_campaign_groups_and_streaks.sql, which runs first (the filenames
-- sort that way). Inlining the EXISTS here instead would re-enter the
-- members table's own row policy and raise
-- "42P17 infinite recursion detected in policy", which would take down the
-- read of every PUBLIC post as well, not just the group ones.

-- Replace the blanket public-read policy.
--
-- Before: `status = 'visible'`, full stop. A group post inserted with that
-- status would have been world-readable.
-- After: a post with no group is public as before; a post with a group is
-- visible only to a member of that group.
drop policy if exists "community_posts_public_read" on public.community_posts;
create policy "community_posts_public_read" on public.community_posts
  for select using (
    status = 'visible'
    and (
      group_id is null
      or public.is_campaign_group_member(group_id)
    )
  );

-- Replies inherit their post's audience. A reply row carries no group of its
-- own, so the check walks to the parent: a reply to a group post is readable
-- exactly when the post is.
drop policy if exists "community_replies_public_read"
  on public.community_post_replies;
create policy "community_replies_public_read"
  on public.community_post_replies
  for select using (
    status = 'visible'
    and exists (
      select 1
        from public.community_posts p
       where p.id = community_post_replies.post_id
         and p.status = 'visible'
         and (
           p.group_id is null
           or public.is_campaign_group_member(p.group_id)
         )
    )
  );

-- The reply-count bump function is unchanged, but the join above means the
-- replies policy now touches two more tables per row. Both lookups are
-- primary-key or unique-index hits, so this stays an index scan.
