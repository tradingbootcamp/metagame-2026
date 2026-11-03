import { connection } from "next/server";
import ChildrenTool from "./ChildrenTool";
import ToolSignIn from "@/components/ToolSignIn";
import { toolAccess } from "@/lib/admin-auth";
import { loadChildren, type ChildrenData } from "@/lib/children";

export default async function AdminChildrenPage() {
  await connection();

  const access = await toolAccess("children.view");
  if (!access)
    return <ToolSignIn title="Children" next="/backstage/children" />;

  let data: ChildrenData;
  try {
    data = await loadChildren();
  } catch (err) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Couldn&rsquo;t read the Children table:{" "}
        {err instanceof Error ? err.message : String(err)}
      </p>
    );
  }
  return <ChildrenTool data={data} />;
}
