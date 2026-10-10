import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { currentSession } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import ContentPage from "@/v2/components/ContentPage";

export const metadata: Metadata = {
  title: "Sign in — Metagame 2026",
  robots: { index: false },
};

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
      eyebrow="Account"
      title="Sign in"
      intro={
        <p>
          Enter your email and we&apos;ll send you a six-digit code. No account
          yet? The code creates one.
        </p>
      }
    >
      <LoginForm next={target} />
    </ContentPage>
  );
}
