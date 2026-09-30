export const fieldClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-navy";
export const buttonClass =
  "w-full rounded-lg bg-meeple px-4 py-2.5 font-roboto font-semibold text-white transition-colors hover:bg-meeple-dark disabled:opacity-60";
export const smallButtonClass =
  "rounded-md border border-line bg-white px-2.5 py-1 text-sm text-ink/80 transition-colors hover:border-navy hover:text-navy disabled:opacity-60";

export function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm">
      <h1 className="font-bebas mb-4 text-2xl tracking-wide text-navy">
        {title}
      </h1>
      {children}
    </div>
  );
}
