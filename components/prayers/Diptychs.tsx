"use client";

// Diptychs — the two lists every Orthodox Christian eventually keeps:
// the living, prayed for by name; and the reposed, commemorated on the
// anniversary of their falling-asleep. The page on /prayers/personal
// is just this component.
//
// Local-first: writes go straight to localStorage. The opt-in sync
// bridge (lib/prayers/sync.ts → installPrayerSyncBridge) pushes the
// list up to Supabase whenever a signed-in user mutates it.

import { useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  deleteIntention,
  upsertIntention,
  useIntentions,
  uuid,
  type Intention,
  type IntentionKind,
} from "@/lib/prayers/storage";

export function Diptychs() {
  const { t } = useTranslate();
  return (
    <div className="space-y-8">
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
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-5 md:p-6">
      <header className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
            {t("prayers.diptychs.eyebrow")}
          </p>
          <h2 className="mt-1 font-sans text-title-sm md:text-title font-bold text-paper">
            {heading}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-pill border border-gold/40 bg-gold/[0.08] text-gold px-4 py-1.5 font-sans text-detail font-semibold hover:bg-gold/[0.14] transition-colors"
        >
          + {t("prayers.diptychs.add")}
        </button>
      </header>
      <p className="font-serif text-ui text-paper/75 leading-[1.6] mb-4">
        {intro}
      </p>

      {items.length > 5 && (
        <input
          type="search"
          placeholder={t("common.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full mb-4 rounded-md border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/45"
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

      <ul className="space-y-2">
        {filtered.length === 0 && !adding && (
          <li className="font-sans text-detail text-paper/40 italic py-4">
            {items.length === 0
              ? t("prayers.diptychs.empty")
              : t("bible.noMatches")}
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
            <IntentionCard
              key={entry.id}
              kind={kind}
              entry={entry}
              onEdit={() => setEditingId(entry.id)}
              onDelete={() => {
                if (
                  confirm(
                    t("prayers.diptychs.removeConfirm", { name: entry.name }),
                  )
                ) {
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

function IntentionCard({
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
  return (
    <li className="rounded-md border border-paper/10 bg-paper/[0.02] px-4 py-3 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-ui font-semibold text-paper leading-snug">
            {entry.name}
            {entry.relationship && (
              <span className="ml-2 font-normal text-paper/55 text-detail">
                {entry.relationship}
              </span>
            )}
          </p>
          {entry.note && (
            <p className="mt-1 font-serif italic text-ui text-paper/65 leading-[1.5]">
              {entry.note}
            </p>
          )}
          <p className="mt-1.5 font-sans text-caption text-paper/45">
            {kind === "living" && entry.nameday && (
              <>{t("prayers.diptychs.namedayLabel")} {formatMmDd(entry.nameday)} · </>
            )}
            {kind === "departed" && entry.repose && (
              <>{t("prayers.diptychs.reposedLabel")} {entry.repose} · </>
            )}
            {entry.tags && entry.tags.length > 0 && (
              <span>{entry.tags.map((t) => `#${t}`).join(" ")}</span>
            )}
          </p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="font-sans text-eyebrow text-paper/55 hover:text-paper transition-colors"
          >
            {t("common.edit")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="font-sans text-eyebrow text-rose-300/75 hover:text-rose-300 transition-colors"
          >
            {t("prayers.diptychs.remove")}
          </button>
        </div>
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
    <div className="rounded-md border border-gold/30 bg-gold/[0.04] p-4 my-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          /* eslint-disable-next-line jsx-a11y/no-autofocus -- the form is
             revealed by an explicit user action (add/edit intention), so
             moving focus into its first field is expected, not a steal. */
          autoFocus
          placeholder={t("prayers.diptychs.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="md:col-span-2 rounded-md border border-paper/15 bg-night px-3 py-2 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/45"
        />
        <input
          placeholder={t("prayers.diptychs.relationship")}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="rounded-md border border-paper/15 bg-night px-3 py-2 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/45"
        />
      </div>
      <textarea
        placeholder={t("prayers.diptychs.note")}
        maxLength={500}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-md border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/45"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {kind === "living" ? (
          <input
            placeholder={t("prayers.diptychs.nameday")}
            value={nameday}
            onChange={(e) => setNameday(e.target.value)}
            pattern="\d{2}-\d{2}"
            className="rounded-md border border-paper/15 bg-night px-3 py-2 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/45"
          />
        ) : (
          <input
            type="date"
            placeholder={t("prayers.diptychs.reposed")}
            value={repose}
            onChange={(e) => setRepose(e.target.value)}
            className="rounded-md border border-paper/15 bg-night px-3 py-2 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/45"
          />
        )}
        <input
          placeholder={t("prayers.diptychs.tags")}
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          className="rounded-md border border-paper/15 bg-night px-3 py-2 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/45"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="font-sans text-caption text-paper/65 hover:text-paper transition-colors px-3"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="rounded-pill border border-gold/45 bg-gold/[0.1] text-gold font-sans text-caption font-semibold px-4 py-1.5 hover:bg-gold/[0.18] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}

function formatMmDd(mmdd: string): string {
  const [m, d] = mmdd.split("-").map((s) => parseInt(s, 10));
  if (Number.isNaN(m) || Number.isNaN(d)) return mmdd;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}`;
}
