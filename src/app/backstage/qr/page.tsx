import { connection } from "next/server";
import QrTool from "./QrTool";
import ToolSignIn from "@/components/ToolSignIn";
import { toolAccess } from "@/lib/admin-auth";

export default async function QrPage() {
  await connection();
  const access = await toolAccess("misc.qr");
  if (!access) return <ToolSignIn title="QR codes" next="/backstage/qr" />;
  return <QrTool />;
}
