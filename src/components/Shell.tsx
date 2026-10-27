import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function Screen({
  title,
  subtitle,
  back,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-8 pt-5">
      <header className="mb-5 flex items-start gap-3">
        {back && (
          <button
            onClick={() => nav(-1)}
            aria-label="Back"
            className="mt-1 shrink-0 rounded-lg px-2 py-1 text-2xl leading-none text-sand-200"
          >
            ‹
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-sand-50">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-sand-200/60">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export function Empty({ text, cta }: { text: string; cta?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 py-10 text-center">
      <p className="text-sand-200/60">{text}</p>
      {cta}
    </div>
  );
}
