import type { SVGProps } from "react";

/**
 * Reddit "Snoo" mark. Filled with `currentColor` so it takes the tone of its
 * surrounding text/link, like the Discord, Instagram, and TikTok marks.
 */
export function Reddit({
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.01 13.47c.02.16.03.32.03.49 0 2.5-2.91 4.53-6.5 4.53s-6.5-2.03-6.5-4.53c0-.17.01-.33.03-.49a1.46 1.46 0 1 1 1.6-2.37 7.13 7.13 0 0 1 3.88-1.23l.74-3.46a.31.31 0 0 1 .37-.24l2.45.52a1.04 1.04 0 1 1-.13.62l-2.18-.46-.66 3.11a7.13 7.13 0 0 1 3.83 1.23 1.46 1.46 0 1 1 1.74 2.18l-.03.07zM8.67 12.6a1.04 1.04 0 1 0 2.08 0 1.04 1.04 0 0 0-2.08 0zm5.78 2.74a.31.31 0 0 0-.44-.02c-.5.42-1.27.62-2.01.62s-1.51-.2-2.01-.62a.31.31 0 1 0-.4.48c.64.54 1.55.78 2.41.78s1.77-.24 2.41-.78a.31.31 0 0 0 .04-.44zm-1.2-1.7a1.04 1.04 0 1 0 2.08 0 1.04 1.04 0 0 0-2.08 0z" />
    </svg>
  );
}
