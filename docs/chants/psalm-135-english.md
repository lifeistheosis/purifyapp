# Psalm 135 in English: where each line comes from

The English version of Psalm 135 (`data/chants/psalm-135.json`, version `en`, Eikona's
recording) shows the words the choir sings, as nearly as public-domain printings allow.
The owner's word of 2026-10-31: "give thanks unto the Lord. You can't copyright those
words." The choir sings a modern English psalter whose own wording is not copied here.
Each line below is printed verbatim from one public-domain printing: the King James
Version first, and where its wording differs from the singing, the printing whose line is
nearest to what is sung, word for word.

The printings, and the lines taken from each, are held by
`lib/chants/__tests__/fixtures/psalm-135-en-printings.json` and the data test:

- **King James**: The King James Version (1611), the 1769 Oxford text as eBible.org
  transcribes it, Psalm 136 (LORD printed Lord).
- **American Standard**: The American Standard Version (1901), as eBible.org transcribes it,
  Psalm 136.
- **Brenton**: Sir Lancelot C. L. Brenton, The Septuagint Version of the Old Testament, with
  an English Translation (1851), Psalm 135, as Purify's Bible has it.
- **Thomson**: Charles Thomson, The Old Covenant, commonly called the Old Testament,
  translated from the Septuagint (Philadelphia: Jane Aitken, 1808), in S. F. Pells's
  facsimile reprint (London: Skeffington, 1904), volume 2, Psalm 135 (headed CXXXVI), every
  line used here read on the page scan at archive.org (`oldcovenantcommo02thom`, leaf 273).
- **Douay-Rheims**: Bishop Challoner's revision as printed in 1899 (offered, not used in the
  end: no line of it came nearest).

What is sung was heard from the recording by two speech models (the English Whisper small,
once as a whole and once line by line, and the multilingual Whisper small, line by line), and
read against the owner's own note of the first four verses. A line they heard less surely, or
heard differently from each other, is marked. Where a line differs from the singing, the
choir's own wording is not written down, here or anywhere in the repository (build 86 note
78): it is its psalter's, still under copyright, and can be shown only once its holder clears
it, entered in the admin's Chant words (lib/chants/cleared.ts).

## The first half of each verse

From build 93 (2026-11-11), a line marked "the nearest wording" is not shown, and neither is verse 26, which a stronger speech model heard sung otherwise: each keeps its place and its time in the data, hidden, with its reason (docs/chants/lyrics-check.md).

| Verse | Line shown | Printing | Against the singing |
| --- | --- | --- | --- |
| 1 | O give thanks unto the Lord; for he is good: | King James | word for word as sung |
| 2 | O give thanks unto the God of gods: | King James | word for word as sung |
| 3 | Oh give thanks unto the Lord of lords; | American Standard | word for word as sung |
| 4 | To him who alone has wrought great wonders: | Brenton | the nearest wording |
| 5 | To him who made the heavens by understanding; | Brenton | the nearest wording |
| 6 | To him who established the earth on the waters; | Brenton | the nearest wording |
| 7 | To him who alone made great lights; | Brenton | the nearest wording |
| 8 | the sun to rule the day: | Thomson | the nearest wording |
| 9 | The moon and the stars to rule the night; | Brenton | the nearest wording |
| 10 | To him that smote Egypt in their firstborn: | King James | the nearest wording |
| 11 | And brought Israel out of the midst of them; | Brenton | the nearest wording (the singing heard less surely) |
| 12 | with a strong hand, and a high arm: | Brenton | the nearest wording (the singing heard less surely) |
| 13 | To him which divided the Red sea into parts: | King James | the nearest wording |
| 14 | And led Israel through the midst thereof: | Thomson | word for word as sung |
| 15 | and overthrew Pharao and his host in the Red Sea: | Brenton | word for word as sung (Pharao is the old spelling) |
| 16 | To him that led his people through the wilderness; | American Standard | word for word as sung |
| 17 | To him that smote great kings; | American Standard | word for word as sung |
| 18 | and slew mighty kings; | Brenton | word for word as sung |
| 19 | Sihon king of the Amorites: | King James | word for word as sung |
| 20 | And Og the king of Bashan: | King James | the nearest wording (the singing heard less surely) |
| 21 | and gave their land for an inheritance: | Brenton | word for word as sung |
| 22 | an inheritance for Israel his servant; | Thomson | word for word as sung |
| 23 | because in our affliction the Lord remembered us; | Thomson | the nearest wording |
| 24 | and redeemed us from our enemies; | Brenton | word for word as sung |
| 25 | Who giveth food to all flesh: | King James | the nearest wording |
| 26 | O give thanks unto the God of heaven: | King James | not shown: the choir sings "Lord of heaven" (Whisper large-v3, 2026-11-11, heard twice) |

## The rest of each verse

- **The refrain**, after the first half of every verse: "for his mercy endureth for ever."
  (King James), as sung.
- **Alleluia.**, after each half: the psalm's own first word in Brenton, as sung.

Thirteen first halves still differ from the singing (verses 4 to 13, 20, 23 and 25): no
public-domain printing found has the choir's wording there, which is its own psalter's. Each
of those lines carries `nearest` in the data file.
