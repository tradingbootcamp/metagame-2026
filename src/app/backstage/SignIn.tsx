import ToolSignIn from "@/components/ToolSignIn";

export default function SignIn({ next }: { next: string }) {
  return <ToolSignIn title="Team tools" next={next} />;
}
