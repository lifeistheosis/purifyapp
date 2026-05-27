# Calendar data files

The `/calendar` page composes three layers at read time:

1. **Pascha** — computed by the algorithm in `lib/calendar/orthodox.ts`. Shared across every canonical Orthodox church.
2. **Base menologion** — `daily-saints.json`. One entry per fixed-date day of the year, ecumenical-Greek-leaning by origin.
3. **Optional jurisdictional patch** — `menologion-{slug}.json`. Adds, reorders, or replaces the headline commemoration for the user's chosen tradition.

The user's preference is stored as two independent axes:

- **Reckoning** (`new` / `old`) — already shipped, controls the Old / New Julian toggle.
- **Tradition** (`ecumenical` / `moscow` / `constantinople` / `antiochian` / `serbian` / `rocor`) — added in v6.4 PRD §4.

Pascha stays one calculation across all matrices. Only the fixed feasts and saint commemorations shift.

## Patch file shape

See `lib/calendar/matrix.ts` for the typed shape. A minimal Russian Orthodox patch would look like:

```json
{
  "matrix": "moscow",
  "notes": "Russian Orthodox Church (Moscow Patriarchate). Defaults to the Old (Julian) reckoning. Adds the Russian-specific commemorations the base menologion omits.",
  "days": {
    "07-15": {
      "add": [
        { "name": "St. Vladimir, Equal-to-the-Apostles, Enlightener of Rus'", "slug": "vladimir-of-kiev", "rank": "feast" }
      ]
    }
  }
}
```

Only days that need overrides need to appear in the file; everything else falls through to the base unchanged.

## Editorial workflow

Each new tradition needs a vetted menologion patch before it ships. The engineering scaffolding (the `CalendarMatrix` type, the registry, the `getMatrix` lookup, and the Supabase columns for storing the preference) is in place; turning on a jurisdiction is then a matter of:

1. Committing `menologion-{slug}.json` with the editorial overrides.
2. Adding the matrix entry to `CALENDAR_MATRICES` in `lib/calendar/matrix.ts`.
3. Wiring the tradition toggle UI to expose the new option.

Until step (1) lands for a given tradition, the matrix entry should remain absent from the registry; surfacing a toggle that resolves to an empty patch would just confuse readers.

## Open editorial questions

Per `docs/prd/v6.4-community-feedback.md` §4: who vets each jurisdictional menologion. Recommend one matrix at a time, with the source synaxarion named in the patch file's `notes` field.
