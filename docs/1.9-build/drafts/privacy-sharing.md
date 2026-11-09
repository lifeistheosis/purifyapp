# Sharing a journal page, for the privacy page (DRAFT)

Fable's release check 1, B3. For Edgar's word: the privacy page is his to
approve, and nothing here is on it yet.

Every sentence below is true of the code on the branch (app/api/journal/share,
lib/journal/share.ts, app/(app)/p/[id], the shared_pages SQL), with one
exception, marked.

## Found while checking

The app offers **Share this page** but no way to stop sharing. The route can
stop a share (DELETE), and no screen calls it. So today a reader can take a
shared page back only by deleting their account. Version A below says what
is true now. Version B is true once a Stop sharing control is in the app. If
he wants stopping a share to delete the copy, that change is ready as a patch:
`docs/1.9-build/drafts/stop-sharing-deletes.patch` (the copy deleted, and the
reports on it with it, by the table's own cascade; tests pass with it applied).

## English

**Version A (true today):**

> **Sharing a journal page.** When you share a page, we keep a copy of it as
> it stood when you shared it, at its own link (purifyapp.net/p/...). Anyone
> with the link can read it. Search engines are kept away from it until we
> have reviewed it; after that they may list it. Your notebooks and tags are
> never in the copy. If someone reports a shared page, we keep the report, the
> account that made it, and anything written with it, up to 500 characters,
> so we can review the page. Deleting your account deletes every page you
> shared, and its reports.

**Version B (once Stop sharing is in the app, with the patch):** Version A,
with this before its last sentence:

> Stop sharing deletes the copy at once, and any reports on it.

## German (the page says "du")

**Version A:**

> **Eine Journalseite teilen.** Wenn du eine Seite teilst, behalten wir eine
> Kopie davon, so wie sie beim Teilen war, unter einem eigenen Link
> (purifyapp.net/p/...). Jeder mit dem Link kann sie lesen. Suchmaschinen
> halten wir von ihr fern, bis wir sie geprüft haben; danach dürfen sie sie
> aufführen. Deine Notizbücher und Schlagwörter sind nie Teil der Kopie. Wenn
> jemand eine geteilte Seite meldet, behalten wir die Meldung, das Konto, das
> sie gemacht hat, und was dazu geschrieben wurde, bis zu 500 Zeichen, damit
> wir die Seite prüfen können. Wenn du dein Konto löschst, werden alle Seiten
> gelöscht, die du geteilt hast, mit ihren Meldungen.

**Version B:** Version A, with this before its last sentence:

> Wenn du das Teilen beendest, wird die Kopie sofort gelöscht, mit allen
> Meldungen dazu.

## What each sentence rests on

- A copy, as it stood: `app/api/journal/share/route.ts` stores `publicBody`
  of the page as sent; the page on the device stays the reader's.
- Anyone with the link: `/p/<id>` needs no sign-in.
- Search engines: `robots: { index: shared.reviewed }` in `app/(app)/p/[id]/page.tsx`.
- Notebooks and tags: `publicPage` in `lib/journal/share.ts` leaves them out.
- A report: `shared_page_reports` keeps `page_id`, `reporter_id` and `reason`
  (at most 500 characters, checked in the route and the table).
- Account deletion: `owner_id ... on delete cascade`, and the reports cascade
  from the page.
