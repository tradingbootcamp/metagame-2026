import { connection } from "next/server";
import SignIn from "../SignIn";
import ChildrenTool from "./ChildrenTool";
import { toolAccess } from "@/lib/admin-auth";
import { loadChildren, type ChildrenData } from "@/lib/children";

export default async function AdminChildrenPage() {
  await connection();

  const access = await toolAccess("children.view");
  if (!access) return <SignIn next="/backstage/children" />;

  let data: ChildrenData = { children: [], families: [] };
  let error: string | null = null;
  try {
    data = await loadChildren();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return <ChildrenTool data={data} error={error} />;
}
