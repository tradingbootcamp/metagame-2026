import { notFound } from "next/navigation";
import LogoDice from "@/components/site/LogoDice";

export const metadata = { title: "LogoDice scratch", robots: { index: false } };

// Scratch page for eyeballing the SVG logo rebuild against the mock's PNG.
// Dev-only: 404s in production builds.
export default function LogoDicePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-screen">
      <section className="bg-white p-8">
        <p className="mb-2 font-mono text-sm text-neutral-500">SVG rebuild</p>
        <LogoDice highlight={true} className="w-full max-w-4xl" />
        <p className="mt-8 mb-2 font-mono text-sm text-neutral-500">
          original logo.png
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="" className="w-full max-w-4xl" />
      </section>
      <section className="bg-neutral-900 p-8">
        <p className="mb-2 font-mono text-sm text-neutral-400">on dark</p>
        <LogoDice highlight className="w-full max-w-4xl" />
        <p className="mt-8 mb-2 font-mono text-sm text-neutral-400">
          on dark + drop shadow
        </p>
        <LogoDice highlight shadow className="w-full max-w-4xl" />
      </section>
      <section className="bg-white p-8">
        <p className="mb-2 font-mono text-sm text-neutral-500">highlight off</p>
        <LogoDice className="w-full max-w-4xl" highlight={false} />
        <p className="mt-8 mb-2 font-mono text-sm text-neutral-500">
          recolored via CSS vars (the point of the exercise)
        </p>
        <LogoDice
          className="w-full max-w-4xl"
          style={
            {
              "--ld-left": "#7c3aed",
              "--ld-right": "#fbbf24",
              "--ld-hi": "#fde68a",
            } as never
          }
        />
      </section>
    </main>
  );
}
