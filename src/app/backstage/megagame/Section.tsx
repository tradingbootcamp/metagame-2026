export default function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bebas text-2xl tracking-wide text-navy">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
