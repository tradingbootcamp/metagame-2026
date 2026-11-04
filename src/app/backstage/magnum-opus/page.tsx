import { connection } from "next/server";
import SignIn from "../SignIn";
import AccountsPane from "./AccountsPane";
import AdminsPane from "./AdminsPane";
import OverridePane from "./OverridePane";
import { pacific } from "./pacific";
import { teamAccess } from "@/lib/access";
import { toolAccess } from "@/lib/admin-auth";
import { listMagnumOpusAdmins } from "@/lib/permission-store";
import { loadOverrides } from "@/lib/site-settings";
import {
  LOANS_CLOSE,
  loansOpen,
  MAGNUM_OPUS_OPENS,
  magnumOpusOpen,
} from "@/lib/magnum-opus";
import { listBalances } from "@/lib/token-store";

export default async function MagnumOpusPage() {
  await connection();

  const access = await toolAccess("magnum_opus.manage");
  if (!access) return <SignIn next="/backstage/magnum-opus" />;

  const [overrides, allBalances, allAdmins, viewer] = await Promise.all([
    loadOverrides(),
    listBalances(),
    listMagnumOpusAdmins(),
    teamAccess(),
  ]);
  // Emails stay behind users.view, as on /backstage/users; this permission
  // goes to volunteers.
  const showEmails = viewer?.permissions.has("users.view") ?? false;
  const scrub = <T extends { email: string }>(rows: T[]): T[] =>
    showEmails ? rows : rows.map((r) => ({ ...r, email: "" }));
  const balances = scrub(allBalances);
  const admins = scrub(allAdmins);
  const { tab, loans: lending } = overrides;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <OverridePane
          name="tab"
          title="Account tab"
          status={
            <>
              The Magnum Opus tab on /account is{" "}
              <strong className="text-navy">
                {magnumOpusOpen(tab.override) ? "visible" : "hidden"}
              </strong>{" "}
              right now.
            </>
          }
          options={[
            {
              value: null,
              label: "On schedule",
              hint: `Hidden until ${pacific(MAGNUM_OPUS_OPENS)}, then shown. Always shown in local dev.`,
            },
            { value: true, label: "Shown", hint: "Visible to everyone now." },
            {
              value: false,
              label: "Hidden",
              hint: "Hidden from everyone, local dev too.",
            },
          ]}
          override={tab.override}
          updatedAt={tab.updatedAt?.getTime() ?? null}
          updatedBy={tab.updatedBy}
        />
        <OverridePane
          name="loans"
          title="Loans"
          status={
            <>
              Loans are{" "}
              <strong className="text-navy">
                {loansOpen(lending.override) ? "open" : "closed"}
              </strong>{" "}
              right now. Only ticket holders can borrow, and only while the tab
              is visible.
            </>
          }
          options={[
            {
              value: null,
              label: "On schedule",
              hint: `Open until ${pacific(LOANS_CLOSE)}, then closed. Always open in local dev.`,
            },
            { value: true, label: "Open", hint: "Anyone eligible can borrow." },
            {
              value: false,
              label: "Closed",
              hint: "Nobody can borrow, local dev too.",
            },
          ]}
          override={lending.override}
          updatedAt={lending.updatedAt?.getTime() ?? null}
          updatedBy={lending.updatedBy}
        />
      </div>
      <AccountsPane rows={balances} selfId={access.userId} />
      <AdminsPane admins={admins} accounts={balances} selfId={access.userId} />
    </div>
  );
}
