import { connection } from "next/server";
import RolesTool from "./RolesTool";
import ToolSignIn from "@/components/ToolSignIn";
import { can } from "@/lib/access";
import { listRoles } from "@/lib/permission-store";

// Account-only, like /backstage/users: a password session can't hold roles.manage.
export default async function AdminRolesPage() {
  await connection();

  if (!(await can("roles.manage")))
    return <ToolSignIn title="Roles" next="/backstage/roles" />;

  return <RolesTool roles={await listRoles()} />;
}
