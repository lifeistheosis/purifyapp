"use client";

import { useRef, useState } from "react";
import { Card, Toolbar, ToolbarButton } from "../primitives";
import { useInsights } from "@/lib/admin/insights/store";

/**
 * Getting a report into the panel.
 *
 * Two ways in, because the two are genuinely different acts. A drop zone is
 * right when a file is already on disk. A paste box is right when the report
 * is on screen in a browser tab, which is where a Play Console export usually
 * is, and telling the operator to save it first only to open it again is a
 * detour. Both land in the same importCsv.
 *
 * NOTHING HERE TOUCHES THE DATABASE. An import replaces the imported dataset
 * and nothing else: the panel's real analytics, orders and expenses are server
 * truth, and a pasted file has no business deleting them. The card says so,
 * because "flush and repopulate" is alarming if you cannot see where the edge
 * of it is.
 */
export function DataImport() {
  const { importCsv, dataset, importing, lastError, clearDataset } = useInsights();
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 8 MB. A daily export covering five years is well under a megabyte, so
  // anything past this is a wrong file rather than a big one, and reading it
  // would lock the tab up while it parsed.
  const MAX_BYTES = 8 * 1024 * 1024;

  function readFile(file: File) {
    setFileError(null);
    if (file.size > MAX_BYTES) {
      setFileError(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB, which is far larger than any daily export. Check it is the right file.`);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setFileError(`${file.name} could not be read.`);
    reader.onload = () => importCsv(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  }

  return (
    <Card
      title="Import a report"
      subtitle="Paste a CSV, or drop the file. Everything on this page recalculates the moment it lands."
      action={
        dataset ? (
          <Toolbar>
            <ToolbarButton
              variant="danger"
              onClick={clearDataset}
              title="Forget the imported report. Nothing on the server is touched."
            >
              Forget report
            </ToolbarButton>
          </Toolbar>
        ) : undefined
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span
            className="mb-1 block font-sans text-[11.5px]"
            style={{ color: "var(--adm-ink-3)" }}
          >
            Paste the CSV here
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            spellCheck={false}
            placeholder={'Date,"Installed audience ...": All countries / regions\n"Aug 18, 2026",932'}
            className="w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-mono text-[12px]"
            style={{
              background: "var(--adm-control)",
              borderColor: "var(--adm-line-strong)",
              color: "var(--adm-ink)",
              resize: "vertical",
            }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ToolbarButton
              variant="primary"
              loading={importing}
              onClick={() => {
                if (!text.trim()) return;
                importCsv(text, "Pasted report");
              }}
            >
              {importing ? "Reading" : "Import pasted CSV"}
            </ToolbarButton>
            {text ? (
              <ToolbarButton onClick={() => setText("")}>Clear box</ToolbarButton>
            ) : null}
          </div>
        </label>

        {/* The drop zone is a LABEL wrapping a real file input, not a div with
            a click handler. That way the keyboard reaches it, the screen
            reader announces it as a file control, and the browser's own file
            picker does the work. */}
        <div>
          <span
            className="mb-1 block font-sans text-[11.5px]"
            style={{ color: "var(--adm-ink-3)" }}
          >
            Or drop the file
          </span>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readFile(file);
            }}
            className="flex h-[164px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--adm-radius)] border border-dashed px-4 text-center"
            style={{
              borderColor: dragging ? "var(--adm-accent)" : "var(--adm-line-strong)",
              background: dragging
                ? "color-mix(in oklab, var(--adm-accent), transparent 92%)"
                : "var(--adm-panel-2)",
              transition: "background 160ms ease, border-color 160ms ease",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
                // Reset, so choosing the same file twice fires again. Without
                // this a re-import of a corrected file looks like a dead click.
                e.target.value = "";
              }}
            />
            <span className="font-sans text-[13px] font-medium" style={{ color: "var(--adm-ink)" }}>
              {dragging ? "Let go to import" : "Drop a CSV here"}
            </span>
            <span className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              or click to choose one
            </span>
          </label>
        </div>
      </div>

      {(lastError || fileError) && (
        <p
          className="mt-4 rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12px]"
          style={{
            borderColor: "color-mix(in oklab, var(--adm-critical), transparent 60%)",
            background: "color-mix(in oklab, var(--adm-critical), transparent 92%)",
            color: "var(--adm-critical)",
          }}
        >
          {fileError ?? lastError}
          {dataset ? " The report already loaded is untouched." : ""}
        </p>
      )}

      {dataset && (
        <div className="mt-4">
          <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
            <span style={{ color: "var(--adm-ink)" }}>{dataset.label}</span>
            {" · "}
            {dataset.series.length} series
            {" · "}
            {dataset.rowCount} rows
            {dataset.firstDay && dataset.lastDay
              ? ` · ${dataset.firstDay} to ${dataset.lastDay}`
              : ""}
          </p>
          {dataset.warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {dataset.warnings.map((w) => (
                <li key={w} className="font-sans text-[11.5px]" style={{ color: "var(--adm-warn)" }}>
                  {w}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Held in this browser only. It survives a reload, it does not follow
            you to another machine, and importing again replaces it. Nothing on
            the server is written or deleted by an import.
          </p>
        </div>
      )}
    </Card>
  );
}
