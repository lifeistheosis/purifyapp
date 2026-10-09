# Step 6 of 6 (Oct 8): a piece with a post record leaves the yes or no queue, and its "Needs your call" pill hides.
import re
s = open('../morning/index.html', encoding='utf-8').read()
s = s.replace('''      deckCount();
      all("[data-posted]").forEach(function (box) {''', '''      // A piece that went up is no longer waiting on a yes or no (Oct 8), whoever recorded the post.
      Object.keys(state.posted).forEach(function (k) { var p = state.posted[k]; if (p && p.piece) decided[p.piece] = true; });
      deckCount();
      all("[data-posted]").forEach(function (box) {''', 1)
s = s.replace('</style>', '.needs.decided .m .pill.warn { display: none; }\n</style>', 1)
open('index.html', 'w', encoding='utf-8').write(s)
