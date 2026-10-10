import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import AuthForm from "@/v2/components/auth/AuthForm";
import ContentPage from "@/v2/components/ContentPage";

export const metadata: Metadata = {
  title: "Create an account — Metagame 2026",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(Array.isArray(next) ? next[0] : next);
  if (await currentSession()) redirect(target);

  return (
    <ContentPage
      eyebrow="Account"
      title="Create an account"
      intro={<p>We&apos;ll email you a code to confirm your address.</p>}
    >
      <AuthForm mode="signup" next={target} />
    </ContentPage>
  );
}
