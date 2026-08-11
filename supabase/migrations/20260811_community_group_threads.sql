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
      or exists (
        select 1
          from public.prayer_campaign_group_members m
         where m.group_id = community_posts.group_id
           and m.user_id = auth.uid()
      )
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
           or exists (
             select 1
               from public.prayer_campaign_group_members m
              where m.group_id = p.group_id
                and m.user_id = auth.uid()
           )
         )
    )
  );

-- The reply-count bump function is unchanged, but the join above means the
-- replies policy now touches two more tables per row. Both lookups are
-- primary-key or unique-index hits, so this stays an index scan.
