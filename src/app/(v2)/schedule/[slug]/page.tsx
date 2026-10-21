import type { Metadata } from "next";
import Link from "next/link";
import SessionDetails, {
  sessionMetadata,
} from "@/v2/components/schedule/SessionDetails";
import { prelaunchGate } from "../data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await prelaunchGate();
  return sessionMetadata((await params).slug);
}

export default async function SessionPage({ params }: Props) {
  await prelaunchGate();
  const { slug } = await params;
  return (
    <div className="mx-auto max-w-[820px] px-8 pt-28 pb-20 text-[#1b1530]">
      <div className="mb-6">
        <Link
          href="/schedule"
          className="text-sm text-[#1b1530]/60 hover:text-navy"
        >
          ← Schedule
        </Link>
      </div>
      <SessionDetails slug={slug} />
    </div>
  );
}
