// Minimal CSV serializer + download helper used by admin tables.
// Quoting rules: wrap any cell containing comma, quote, or newline in
// double-quotes and double-up internal quotes. Header row required.

import { downloadFile } from "@/lib/ui/downloadFile";

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return lines.join("\n");
}

// Triggers a browser download of the CSV. Safe to call from a button onClick.
export function downloadCsv(filename: string, csv: string): void {
  downloadFile(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}
