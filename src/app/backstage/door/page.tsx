import { connection } from "next/server";
import DoorLookup from "./DoorLookup";
import ToolSignIn from "@/components/ToolSignIn";
import { toolAccess } from "@/lib/admin-auth";

export default async function DoorPage() {
  await connection();

  const access = await toolAccess("checkin.view");
  if (!access) return <ToolSignIn title="Door" next="/backstage/door" />;
  return <DoorLookup />;
}
