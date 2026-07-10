import { Fragment } from "react";

/**
 * Renders store policy text: paragraphs split on blank lines, with
 * **bold** spans honored. Deliberately not a markdown engine — policy
 * copy is operator-authored and needs exactly this much.
 */
export function PolicyText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  return (
    <>
      {paragraphs.map((para, i) => (
        <p
          key={i}
          className="mt-3 first:mt-0 font-serif text-body text-paper/70 leading-[1.65]"
        >
          {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold text-paper/90">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}
