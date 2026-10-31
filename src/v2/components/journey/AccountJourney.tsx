import Journey from "./Journey";
import { accountPrefill } from "@/lib/form-prefill";

export default async function AccountJourney({ slug }: { slug: string }) {
  return <Journey slug={slug} prefill={await accountPrefill()} />;
}
