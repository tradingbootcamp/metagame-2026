import { PasswordForm } from "./SignInForms";
import ToolSignIn from "@/components/ToolSignIn";
import { isConfigured } from "@/lib/grader-auth";

export default function SignIn() {
  return (
    <ToolSignIn
      title="Speaker committee"
      next="/grade"
      passwordForm={isConfigured() && <PasswordForm />}
    />
  );
}
