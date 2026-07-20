import type { ReactNode } from "react";

/**
 * Renders content for screen readers only — visually equivalent to Radix's
 * `VisuallyHidden`, but this project has no Radix dependency, so it's just
 * Tailwind's `sr-only` utility wrapped in a component for a self-documenting
 * call site (e.g. a dialog's accessible-name heading that the design doesn't
 * want to show).
 */
export function VisuallyHidden({ as: Tag = "span", children, ...props }: {
  as?: "span" | "h2";
  children: ReactNode;
  id?: string;
}) {
  return (
    <Tag className="sr-only" {...props}>
      {children}
    </Tag>
  );
}
