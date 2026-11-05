import type { ComponentProps, ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "red" | "sun" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  red: "bg-red text-white hover:brightness-110",
  sun: "bg-sun text-[#14182b] hover:brightness-105",
  outline: "border border-line bg-card text-ink hover:border-ink/40",
  ghost: "text-ink-2 hover:bg-ink/5 hover:text-ink",
  danger: "text-red hover:bg-red-soft",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-5 text-[15px] gap-2 rounded-2xl",
  lg: "h-14 px-7 text-base gap-2.5 rounded-2xl",
};

export function btn(variant: Variant = "primary", size: Size = "md", extra?: string): string {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={btn(variant, size, className)} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("rounded-3xl border border-line bg-card shadow-soft", className)} />;
}

const fieldBase =
  "w-full rounded-2xl border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-blue focus:outline-none focus:ring-4 focus:ring-blue/15";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(fieldBase, "h-12", className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(fieldBase, "min-h-24 py-3 leading-relaxed", className)} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cn(fieldBase, "h-12 appearance-none pr-10", className)} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label {...props} className={cn("mb-1.5 block text-sm font-semibold text-ink-2", className)} />;
}

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-ink-3">{hint}</p> : null}
    </div>
  );
}

type Tone = "neutral" | "red" | "sun" | "blue" | "green";
const TONES: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-2",
  red: "bg-red-soft text-red",
  sun: "bg-sun-soft text-[#8a5a00] dark:text-sun",
  blue: "bg-blue-soft text-blue",
  green: "bg-green-soft text-green",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      {...props}
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", TONES[tone], className)}
    />
  );
}
