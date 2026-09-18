import { Check, Info } from "lucide-react";
import { AUDIENCE_LABEL, type AudienceKey } from "@/lib/marketing";

/**
 * How a guest segment currently stands on a campaign:
 * - `free`   — nothing carries it yet, ready to be assigned
 * - `on`     — this promotion holds it
 * - `erased` — struck out: taken elsewhere, or unchecked here
 */
export type SegmentState = "free" | "on" | "erased";

const TONES: Record<SegmentState, string> = {
  free: "border-border bg-background text-muted-foreground",
  on: "border-brand/50 bg-brand-soft text-brand",
  erased: "border-transparent bg-muted text-muted-foreground/40 line-through",
};

const BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors";

/**
 * The guest-segment chip used across every promotion surface so Direct and OTA
 * always read the same way — filled when held, struck out when not.
 */
export function SegmentPill({
  audience,
  state,
  title,
  disabled,
  onClick,
  className = "",
}: {
  audience: AudienceKey;
  state: SegmentState;
  title?: string;
  disabled?: boolean;
  /** When provided the chip becomes a toggle and reports the next value. */
  onClick?: (value: boolean) => void;
  className?: string;
}) {
  const tone = `${BASE} ${TONES[state]} ${className}`;
  const label = AUDIENCE_LABEL[audience] ?? audience;

  if (!onClick) {
    return (
      <span title={title} className={tone}>
        {state === "on" && <Check size={8} strokeWidth={3.5} />}
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-pressed={state === "on"}
      onClick={() => onClick(state !== "on")}
      className={`${tone} ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:border-brand/45"}`}
    >
      <span
        className={`grid size-2.5 place-items-center rounded-[2px] border border-current ${
          state === "on" ? "bg-brand text-brand-foreground" : ""
        }`}
      >
        {state === "on" && <Check size={8} strokeWidth={3.5} />}
      </span>
      {label}
      {disabled && <Info size={10} className="text-muted-foreground" />}
    </button>
  );
}
