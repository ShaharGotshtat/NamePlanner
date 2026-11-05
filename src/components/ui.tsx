import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Mascot, type MascotMood } from "./Mascot";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-rose-dark text-white hover:bg-rose-deep disabled:bg-rose-dark/40",
  secondary: "border-2 border-ink/15 bg-white text-ink hover:border-ink/30 disabled:opacity-50",
  ghost: "text-ink-soft underline-offset-2 hover:underline disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`min-h-11 rounded-2xl px-5 font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Toggle({
  selected,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      aria-pressed={selected}
      className={`min-h-11 rounded-full border-2 px-4 text-sm font-medium transition-colors ${
        selected ? "border-lavender-dark bg-lavender-dark text-white" : "border-line bg-white text-ink hover:border-lavender-dark/50"
      } ${className}`}
      {...props}
    />
  );
}

export function ScreenTitle({ children, subtitle, mood }: { children: ReactNode; subtitle?: ReactNode; mood?: MascotMood }) {
  return (
    <header className="mb-6 flex items-start gap-3">
      <div className="flex-1">
        <h1 className="font-display text-2xl font-semibold leading-tight">{children}</h1>
        {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
      </div>
      {mood && <Mascot key={mood} mood={mood} size={72} className="animate-mascot-pop" />}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-line ${className}`}>{children}</section>;
}

export const inputClass =
  "min-h-11 w-full rounded-xl border-2 border-line bg-white px-3 text-ink placeholder:text-ink-soft/60 focus:border-lavender-dark focus:outline-none";
