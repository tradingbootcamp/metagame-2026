import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import AuthForm from "@/v2/components/auth/AuthForm";
import ContentPage from "@/v2/components/ContentPage";

export const metadata: Metadata = {
  title: "Sign in — Metagame 2026",
  robots: { index: false },
};

// Sign in and sign up are the same form: it asks for the email first and
// takes it from there.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(Array.isArray(next) ? next[0] : next);
  if (await currentSession()) redirect(target);

  return (
    <ContentPage
      title="Sign in"
      intro={<p>Enter your email to sign in or create an account.</p>}
    >
      <AuthForm next={target} />
    </ContentPage>
  );
}
