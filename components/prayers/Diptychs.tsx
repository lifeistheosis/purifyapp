"use client";

// Diptychs: the two lists every Orthodox Christian eventually keeps: the
// living, prayed for by name; and the reposed, commemorated on the
// anniversary of their falling-asleep. They stand under a reader's own rule
// on /prayers/personal (1.7), and the rule can take them in as one of its
// steps, "Those I pray for".
//
// Local-first: writes go straight to localStorage. The opt-in sync bridge
// (lib/prayers/sync.ts, installPrayerSyncBridge) pushes the lists up to
// Supabase whenever a signed-in user changes them.
//
// 1.7: hairline lists in place of tinted cards, the add and save controls in
// the page's own ink, and Edit and Remove always shown: they were drawn only
// on a mouse's hover, so a phone never had them.

import { useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Plus } from "@/components/ui/icons/Plus";
import {
  deleteIntention,
  upsertIntention,
  useIntentions,
  uuid,
  type Intention,
  type IntentionKind,
} from "@/lib/prayers/storage";

const FIELD =
  "min-h-11 w-full rounded-[10px] bg-paper/[0.06] px-3 py-2 font-sans text-ui text-paper placeholder:text-paper/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-paper/40";

export function Diptychs() {
  const { t } = useTranslate();
  return (
    <div className="space-y-10">
      <DiptychSection
        kind="living"
        heading={t("prayers.diptychs.livingHeading")}
        intro={t("prayers.diptychs.livingIntro")}
      />
      <DiptychSection
        kind="departed"
        heading={t("prayers.diptychs.reposedHeading")}
        intro={t("prayers.diptychs.reposedIntro")}
      />
    </div>
  );
}

function DiptychSection({
  kind,
  heading,
  intro,
}: {
  kind: IntentionKind;
  heading: string;
  intro: string;
}) {
  const { t } = useTranslate();
  const items = useIntentions(kind);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          (i.relationship ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (i.note ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  return (
    <section aria-labelledby={`diptych-${kind}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 id={`diptych-${kind}`} className="text-lede font-bold leading-tight text-paper">
          {heading}
        </h3>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="tap-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-4 font-sans text-detail font-semibold text-paper ring-1 ring-inset ring-paper/20 hover:bg-paper/[0.06]"
        >
          <Plus size={15} className="shrink-0" />
          {t("prayers.diptychs.add")}
        </button>
      </div>
      <p className="mt-1.5 font-sans text-detail leading-[1.6] text-paper/60">{intro}</p>

      {items.length > 5 && (
        <input
          type="search"
          placeholder={t("common.search")}
          aria-label={t("common.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${FIELD} mt-4`}
        />
      )}

      {adding && (
        <IntentionForm
          kind={kind}
          onCancel={() => setAdding(false)}
          onSave={(entry) => {
            upsertIntention(kind, entry);
            setAdding(false);
          }}
        />
      )}

      <ul className="mt-3 divide-y divide-paper/10 border-y border-paper/10">
        {filtered.length === 0 && !adding && (
          <li className="py-4 font-sans text-detail text-paper/50">
            {items.length === 0 ? t("prayers.diptychs.empty") : t("bible.noMatches")}
          </li>
        )}
        {filtered.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id}>
              <IntentionForm
                kind={kind}
                initial={entry}
                onCancel={() => setEditingId(null)}
                onSave={(next) => {
                  upsertIntention(kind, next);
                  setEditingId(null);
                }}
              />
            </li>
          ) : (
            <IntentionRow
              key={entry.id}
              kind={kind}
              entry={entry}
              onEdit={() => setEditingId(entry.id)}
              onDelete={() => {
                if (confirm(t("prayers.diptychs.removeConfirm", { name: entry.name }))) {
                  deleteIntention(kind, entry.id);
                }
              }}
            />
          ),
        )}
      </ul>
    </section>
  );
}

function IntentionRow({
  kind,
  entry,
  onEdit,
  onDelete,
}: {
  kind: IntentionKind;
  entry: Intention;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslate();
  const facts = [
    kind === "living" && entry.nameday ? `${t("prayers.diptychs.namedayLabel")} ${formatMmDd(entry.nameday, t)}` : null,
    kind === "departed" && entry.repose ? `${t("prayers.diptychs.reposedLabel")} ${entry.repose}` : null,
    entry.tags && entry.tags.length > 0 ? entry.tags.map((tag) => `#${tag}`).join(" ") : null,
  ].filter(Boolean);
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-ui font-semibold leading-snug text-paper">
          {entry.name}
          {entry.relationship && (
            <span className="ms-2 font-normal text-detail text-paper/55">{entry.relationship}</span>
          )}
        </p>
        {entry.note && <p className="mt-1 font-serif text-ui italic leading-[1.5] text-paper/65">{entry.note}</p>}
        {facts.length ? <p className="mt-1 font-sans text-caption text-paper/50">{facts.join(" · ")}</p> : null}
      </div>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onEdit}
          className="tap-press inline-flex min-h-11 items-center px-2 font-sans text-caption text-paper/60 hover:text-paper"
        >
          {t("common.edit")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="tap-press inline-flex min-h-11 items-center px-2 font-sans text-caption text-paper/60 hover:text-paper"
        >
          {t("prayers.diptychs.remove")}
        </button>
      </div>
    </li>
  );
}

function IntentionForm({
  kind,
  initial,
  onCancel,
  onSave,
}: {
  kind: IntentionKind;
  initial?: Intention;
  onCancel: () => void;
  onSave: (entry: Intention) => void;
}) {
  const { t } = useTranslate();
  const [name, setName] = useState(initial?.name ?? "");
  const [relationship, setRelationship] = useState(initial?.relationship ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [nameday, setNameday] = useState(initial?.nameday ?? "");
  const [repose, setRepose] = useState(initial?.repose ?? "");
  const [tagText, setTagText] = useState((initial?.tags ?? []).join(", "));

  function handleSave() {
    if (!name.trim()) return;
    const entry: Intention = {
      id: initial?.id ?? uuid(),
      name: name.trim(),
      relationship: relationship.trim() || undefined,
      note: note.trim() || undefined,
      tags: tagText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      addedAt: initial?.addedAt ?? new Date().toISOString(),
      ...(kind === "living"
        ? { nameday: nameday.match(/^\d{2}-\d{2}$/) ? nameday : undefined }
        : { repose: repose.match(/^\d{4}-\d{2}-\d{2}$/) ? repose : undefined }),
    };
    onSave(entry);
  }

  return (
    <div className="my-3 space-y-3 border-y border-paper/15 py-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          /* eslint-disable-next-line jsx-a11y/no-autofocus -- the form is
             revealed by an explicit user action (add/edit intention), so
             moving focus into its first field is expected, not a steal. */
          autoFocus
          placeholder={t("prayers.diptychs.name")}
          aria-label={t("prayers.diptychs.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${FIELD} md:col-span-2`}
        />
        <input
          placeholder={t("prayers.diptychs.relationship")}
          aria-label={t("prayers.diptychs.relationship")}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className={FIELD}
        />
      </div>
      <textarea
        placeholder={t("prayers.diptychs.note")}
        aria-label={t("prayers.diptychs.note")}
        maxLength={500}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={FIELD}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {kind === "living" ? (
          <input
            placeholder={t("prayers.diptychs.nameday")}
            aria-label={t("prayers.diptychs.nameday")}
            value={nameday}
            onChange={(e) => setNameday(e.target.value)}
            pattern="\d{2}-\d{2}"
            className={FIELD}
          />
        ) : (
          <input
            type="date"
            placeholder={t("prayers.diptychs.reposed")}
            aria-label={t("prayers.diptychs.reposed")}
            value={repose}
            onChange={(e) => setRepose(e.target.value)}
            className={FIELD}
          />
        )}
        <input
          placeholder={t("prayers.diptychs.tags")}
          aria-label={t("prayers.diptychs.tags")}
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          className={FIELD}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="tap-press inline-flex min-h-11 items-center px-3 font-sans text-detail text-paper/65 hover:text-paper"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="tap-press inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}

const MONTH_ABBR_KEYS = [
  "common.monthAbbr.jan", "common.monthAbbr.feb", "common.monthAbbr.mar",
  "common.monthAbbr.apr", "common.monthAbbr.may", "common.monthAbbr.jun",
  "common.monthAbbr.jul", "common.monthAbbr.aug", "common.monthAbbr.sep",
  "common.monthAbbr.oct", "common.monthAbbr.nov", "common.monthAbbr.dec",
];

function formatMmDd(
  mmdd: string,
  t: (key: string, replacements?: Record<string, string | number>) => string,
): string {
  const [m, d] = mmdd.split("-").map((s) => parseInt(s, 10));
  if (Number.isNaN(m) || Number.isNaN(d)) return mmdd;
  const monthKey = MONTH_ABBR_KEYS[m - 1];
  if (!monthKey) return mmdd;
  return t("common.monthDay", { month: t(monthKey), day: d });
}
