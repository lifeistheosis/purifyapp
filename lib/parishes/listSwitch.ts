// The one switch for the US parish list (note 54, 2026-10-31).
//
// OFF until the Assembly of Canonical Orthodox Bishops, or the jurisdictions
// themselves, give permission for a list of their parishes. Off, a US priest's
// or deacon's parish screen is a short form that asks them to write their
// parish (its name, and its city and state), the list and its search are never
// loaded, and readers never see the SAMPLE list in ./usParishes.ts.
//
// To turn a permitted list on: put it in ./usParishes.ts (`parishes` replaced,
// `sample: false`, `source` naming who gave it), then set this to true. Nothing
// else changes: the search (./search.ts) and its screen
// (components/onboarding/ClergySteps.tsx) are built and tested already, and a
// test refuses this switch on while the list is still the sample.

export const US_PARISH_LIST_ON: boolean = false;
