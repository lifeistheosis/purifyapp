# The Copenhagen Alliance's standard versification mappings

`eng.json`, `lxx.json` and `rso.json` are copied unchanged from
[Copenhagen-Alliance/versification-specification](https://github.com/Copenhagen-Alliance/versification-specification),
`versification-mappings/standard-mappings/`, at commit
`519af776ab65d89a51e37f750779250f940459ef` (12 October 2026). Their authors, as
that folder's README names them: Reinier de Blois, Neil Rees, Mike Lothers and
Tim Steenwyk (the Septuagint's), Reinier de Blois and Neil Rees (the English),
Peter Kirk, Matjaž Črnivec and Neil Rees (the Russian Synodal, Orthodox
edition). The alliance: the United Bible Societies, SIL, Tyndale House and
YouVersion.

As they came (`lib/bible/__tests__/compareMap.test.ts` holds them to these):

- `eng.json` sha256 `5162023f8e0604fce96a49d7fb8cea73ef699928846d10d62210bd4882e81338`
- `lxx.json` sha256 `90d980f784512aea00af48646c337b1f7cb97bae3023a9223155369034e466f2`
- `rso.json` sha256 `93fbb63369c22022a932acbf562961f1f53998f1edf7140bf4ccb859ad0f3a95`
- `LICENSE.md` sha256 `57524cd67ad8ba7616e756aa59f81bac0e08d3f9899adf7d07e4d9434755ed85`

Licence: the data is CC BY-SA 4.0 (see `LICENSE.md`, as it came). Purify's
verse maps for Compare (`data/bibles/maps/`, made by
`scripts/bibles/compare-map.mjs`) are derived from them and shared under the
same licence, with this credit in each file and in the app. The owner's word,
2026-11-09: "the Copenhagen maps, credited, the map file shared alike."
