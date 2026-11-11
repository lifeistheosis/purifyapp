# The Plus voices of the on-phone voice

One file for each Plus voice, named as the engine names it (`bm_george.bin`),
about half a megabyte each. They are read by `app/api/listen/phone-voice`
after it has checked the reader's Plus on the server, and they are outside
`public/` so that no address serves one without that check.

A voice is put here only after the owner has heard it and kept it
(`docs/1.9-build/OWNER-STEPS.md`, V7) and `lib/listen/phoneVoices.ts` offers it.
The free Heart voice and the engine are not here: they are public files in
Purify's own storage.
