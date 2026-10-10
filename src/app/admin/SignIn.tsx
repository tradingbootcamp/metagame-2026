import { PasswordForm } from "./SignInForms";
import ToolSignIn from "@/components/ToolSignIn";
import { isConfigured } from "@/lib/admin-auth";

export default function SignIn({ next }: { next: string }) {
  return (
    <ToolSignIn
      title="Team tools"
      next={next}
      passwordForm={isConfigured() && <PasswordForm />}
    />
  );
}
