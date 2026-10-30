import Journey from "./Journey";
import { accountPrefill } from "@/lib/form-prefill";

// A journey that opens with the signed-in account's details already filled
// in: name, email, Discord handle, pronouns, wherever the form asks for them.
export default async function AccountJourney({ slug }: { slug: string }) {
  return <Journey slug={slug} prefill={await accountPrefill()} />;
}
