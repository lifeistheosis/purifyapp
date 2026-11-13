import { SANS, T } from "@/lib/email/theme";

/**
 * Charts drawn in the email itself, for the owner's brief
 * (docs/plans/owner-desk.md section 3: "Charts are drawn in the email itself
 * (email clients run no scripts)").
 *
 * WHY TABLES. No mail client runs a script; Gmail drops inline SVG; Outlook
 * on Windows lays out with Word, which ignores most of CSS but honours a
 * table cell's width and height and its bgcolor. So every mark here is a
 * table cell with a colour and a size, written both as attributes and as
 * inline style, with a non-breaking space in it so Outlook does not fold an
 * empty cell to nothing. Every number a chart shows is also written in text
 * beside it, so a reader who sees no colour, or a client that strips the
 * cells, still has the figures.
 *
 * Colours come from the email theme only (lib/email/theme.ts: chartShop and
 * the rest, the admin money chart's hues); lib/email/__tests__/theme.test.ts
 * fails on a colour written here.
 *
 * Pure: values in, markup out. Every label is escaped here.
 */

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type Segment = { value: number; color: string };

/** A cell that is only colour, `h` pixels tall, that Outlook will not fold away. */
function mark(color: string, h: number, extra = ""): string {
  return `<td height="${h}" bgcolor="${color}" style="height:${h}px;background:${color};font-size:1px;line-height:1px;mso-line-height-rule:exactly;${extra}">&nbsp;</td>`;
}

/**
 * Whole percentages that add up to 100, one per positive value, none of them
 * zero (the largest-remainder way, with a floor of 1 so a small source still
 * shows). Values of zero or less get 0.
 */
export function shares(values: readonly number[]): number[] {
  const positive = values.map((v) => (v > 0 ? v : 0));
  const total = positive.reduce((a, v) => a + v, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = positive.map((v) => (v / total) * 100);
  const out = exact.map((x, i) => (positive[i] > 0 ? Math.max(1, Math.floor(x)) : 0));
  let left = 100 - out.reduce((a, v) => a + v, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .filter(({ i }) => positive[i] > 0)
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0 && order.length > 0; k = (k + 1) % order.length, left--) out[order[k].i]++;
  // The floor of 1 can overshoot; take it back from the largest.
  while (left < 0) {
    const big = out.indexOf(Math.max(...out));
    out[big]--;
    left++;
  }
  return out;
}

/**
 * One bar across the letter, split by source, each part as wide as its share.
 * Nothing positive draws the empty track, so the space still reads as "none".
 */
export function stackedBar(segments: readonly Segment[], height = 14): string {
  const pct = shares(segments.map((s) => s.value));
  const cells = segments
    .map((s, i) => (pct[i] > 0 ? mark(s.color, height).replace("<td ", `<td width="${pct[i]}%" `) : ""))
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 10px"><tr>${
    cells || mark(T.chartTrack, height)
  }</tr></table>`;
}

/** The key under a chart: a swatch, the name, and the value in words. */
export function legend(items: readonly { color: string; label: string; value: string; note?: string }[]): string {
  const rows = items.map(
    (it) =>
      `<tr><td width="14" valign="middle" style="width:14px;padding:4px 10px 4px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${mark(it.color, 10, "width:10px;")}</tr></table></td>` +
      `<td valign="middle" style="padding:4px 0;font-family:${SANS};font-size:14px;line-height:1.4;color:${T.body}">${esc(it.label)}</td>` +
      `<td valign="middle" align="right" style="padding:4px 0 4px 10px;font-family:${SANS};font-size:14px;line-height:1.4;color:${T.heading};white-space:nowrap"><strong>${esc(it.value)}</strong>${
        it.note ? ` <span style="color:${T.muted};font-weight:400">${esc(it.note)}</span>` : ""
      }</td></tr>`,
  );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 16px">${rows.join("")}</table>`;
}

export type Column = {
  /** Under the column: "Mon". */
  label: string;
  /** Over the column, already in words ("1,204", "$40"); null leaves it blank. */
  top: string | null;
  /** Stacked from the line up, first at the bottom. */
  segments: Segment[];
  /** Drawn below the line, in the refunds' grey: money given back. */
  below?: number;
};

/**
 * Columns, one a day, each stacked by source, on one scale: the tallest
 * column is `height` pixels. Anything given back hangs below the line on the
 * same scale, as on Money's chart in the admin.
 */
export function columns(cols: readonly Column[], height = 72): string {
  const totals = cols.map((c) => c.segments.reduce((a, s) => a + Math.max(0, s.value), 0));
  const belows = cols.map((c) => Math.max(0, c.below ?? 0));
  const max = Math.max(1, ...totals, ...belows);
  const px = (v: number) => (v <= 0 ? 0 : Math.max(2, Math.round((v / max) * height)));
  const width = `${Math.floor(100 / Math.max(1, cols.length))}%`;
  const belowMax = Math.max(0, ...belows.map(px));

  const top = cols
    .map(
      (c) =>
        `<td width="${width}" align="center" valign="bottom" style="padding:0 2px 4px;font-family:${SANS};font-size:11px;line-height:1.2;color:${T.muted};white-space:nowrap">${
          c.top ? esc(c.top) : "&nbsp;"
        }</td>`,
    )
    .join("");

  const bars = cols
    .map((c) => {
      const parts = c.segments.filter((s) => s.value > 0).map((s) => ({ color: s.color, h: px(s.value) }));
      const used = parts.reduce((a, p) => a + p.h, 0);
      const rows = [
        height - used > 0 ? `<tr><td height="${height - used}" style="height:${height - used}px;font-size:1px;line-height:1px;mso-line-height-rule:exactly">&nbsp;</td></tr>` : "",
        // Stacked from the bottom: the first segment is drawn last.
        ...[...parts].reverse().map((p) => `<tr>${mark(p.color, p.h)}</tr>`),
      ].join("");
      return `<td width="${width}" valign="bottom" style="padding:0 3px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${rows}</table></td>`;
    })
    .join("");

  const line = `<tr><td colspan="${cols.length}" height="1" bgcolor="${T.chartTrack}" style="height:1px;background:${T.chartTrack};font-size:1px;line-height:1px;mso-line-height-rule:exactly">&nbsp;</td></tr>`;

  const under =
    belowMax > 0
      ? `<tr>${cols
          .map((c) => {
            const h = px(Math.max(0, c.below ?? 0));
            return `<td width="${width}" valign="top" style="padding:0 3px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${
              h > 0 ? `<tr>${mark(T.chartBack, h)}</tr>` : ""
            }<tr><td height="${belowMax - h > 0 ? belowMax - h : 1}" style="height:${belowMax - h > 0 ? belowMax - h : 1}px;font-size:1px;line-height:1px;mso-line-height-rule:exactly">&nbsp;</td></tr></table></td>`;
          })
          .join("")}</tr>`
      : "";

  const labels = cols
    .map(
      (c) =>
        `<td width="${width}" align="center" style="padding:6px 2px 0;font-family:${SANS};font-size:11px;line-height:1.2;color:${T.muted}">${esc(c.label)}</td>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 12px"><tr>${top}</tr><tr>${bars}</tr>${line}${under}<tr>${labels}</tr></table>`;
}

/**
 * A ranked list with a bar under each name, as long as its count against the
 * first: what readers opened most, what was searched for and not found.
 */
export function ranked(items: readonly { label: string; value: number; display: string }[], color: string): string {
  const max = Math.max(1, ...items.map((i) => i.value));
  const rows = items.map((it) => {
    const pct = Math.max(2, Math.round((Math.max(0, it.value) / max) * 100));
    return (
      `<tr><td style="padding:6px 10px 2px 0;font-family:${SANS};font-size:14px;line-height:1.35;color:${T.body}">${esc(it.label)}</td>` +
      `<td align="right" valign="bottom" style="padding:6px 0 2px;font-family:${SANS};font-size:14px;line-height:1.35;color:${T.heading};white-space:nowrap"><strong>${esc(it.display)}</strong></td></tr>` +
      `<tr><td colspan="2" style="padding:0 0 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr>${mark(color, 4).replace("<td ", `<td width="${pct}%" `)}${
        pct < 100 ? mark(T.chartTrack, 4).replace("<td ", `<td width="${100 - pct}%" `) : ""
      }</tr></table></td></tr>`
    );
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 16px">${rows.join("")}</table>`;
}
