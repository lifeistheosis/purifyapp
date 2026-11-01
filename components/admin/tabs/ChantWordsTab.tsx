"use client";

// Chant words, folded into Content as Catechism is (build 86 note 78): one
// line on the editors' desk, opening each chant version's cleared words and
// the switch. The view has its own id, so #tab=chant-words lands on that
// line, opened. The detail is components/admin/content/chantWords.tsx.

import { ContentDesk } from "./ContentTab";

export function ChantWordsTab() {
  return <ContentDesk focus="chant-words" />;
}
