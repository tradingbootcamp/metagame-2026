import { PasswordForm } from "./SignInForms";
import ToolSignIn from "@/components/ToolSignIn";
import { isConfigured } from "@/lib/grader-auth";

export default function SignIn() {
  return (
    <ToolSignIn
      title="Speaker committee"
      next="/grade"
      passwordConfigured={isConfigured()}
      passwordEnvs={["GRADER_PASSWORD", "GRADER_SESSION_SECRET"]}
      passwordForm={<PasswordForm />}
    />
  );
}
