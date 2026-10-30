import { connection } from "next/server";
import TeamTool from "./TeamTool";
import ToolSignIn from "@/components/ToolSignIn";
import { can } from "@/lib/access";
import { pacificToday } from "@/lib/team";
import { loadBoard } from "@/lib/team-store";

export default async function TeamPage() {
  await connection();

  const session = await can("team.view");
  if (!session) return <ToolSignIn title="Team" next="/backstage/team" />;

  const [board, manager] = await Promise.all([loadBoard(), can("team.manage")]);
  const me = board.people.find((p) => p.userId === session.user.id)?.id ?? null;
  return (
    <TeamTool
      board={board}
      me={me}
      canManage={!!manager}
      today={pacificToday()}
    />
  );
}
