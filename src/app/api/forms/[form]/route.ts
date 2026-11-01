import { NextResponse } from "next/server";
import { attachFile, createFormRow } from "@/lib/airtable-forms";
import { sendFormBackupEmail } from "@/lib/email";
import { pickUtm } from "@/lib/utm";
import { FORMS } from "@/v2/forms";
import {
  airtableFields,
  answeredEmail,
  answerSheet,
  attachedFiles,
  checkForm,
  cleanAnswers,
  type FileAnswer,
} from "@/v2/forms/engine";

// One route for every journey: POST { answers, utm, website } to
// /api/forms/<slug>. The answers are checked against the same definition the
// page used, then written as one Airtable row (plus any attached file), so
// the person never touches Airtable. If Airtable doesn't take the row, the
// answers are emailed to the team instead, so nobody has to fill the form in
// twice. Only when that fails too does the person see an error (500, or 503
// when the deploy has no Airtable key), never a faked success. `website` is
// a honeypot: people never see it, so anything there is a bot, and it gets a
// quiet "ok".

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ form: string }> },
) {
  const def = FORMS[(await params).form];
  if (!def) {
    return NextResponse.json({ error: "No such form" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const answers = cleanAnswers(def, body.answers);
  const errors = checkForm(def, answers);
  if (Object.keys(errors).length) {
    return NextResponse.json(
      { error: "Some answers need another look", errors },
      { status: 400 },
    );
  }

  const fields = airtableFields(def, answers);
  if (def.utmFields) {
    const sent = (body.utm ?? {}) as Record<string, unknown>;
    const utm = pickUtm((key) => sent[key], UTM_KEYS);
    for (const key of UTM_KEYS) {
      const field = def.utmFields[key];
      if (field && utm[key]) fields[field] = utm[key];
    }
  }

  const files = attachedFiles(def, answers);
  // The answers (and any picture) to the team inbox; true when it went.
  const backUp = async (reason: string) => {
    try {
      return await sendFormBackupEmail({
        form: def.name,
        table: def.tableId,
        reason,
        replyTo: answeredEmail(def, answers),
        answers: answerSheet(def, answers),
        files: files.map((q) => answers[q.key] as FileAnswer),
      });
    } catch (err) {
      console.error(`[forms] ${def.slug}: backup email failed too:`, err);
      return false;
    }
  };
  const backedUp = () =>
    NextResponse.json({ ok: true, stored: false, backedUp: true });

  let row;
  try {
    row = await createFormRow(def.tableId, fields);
  } catch (err) {
    console.error(`[forms] ${def.slug}: failed to store:`, err);
    if (await backUp(String(err))) return backedUp();
    return NextResponse.json(
      { error: "Couldn't save your answers" },
      { status: 500 },
    );
  }
  if (!row.stored) {
    // Local dev without a key: show what would have been written.
    if (process.env.NODE_ENV !== "production")
      return NextResponse.json({ ok: true, stored: false, preview: fields });
    console.error(`[forms] Airtable not configured in production`);
    if (await backUp("The site has no AIRTABLE_API_KEY.")) return backedUp();
    return NextResponse.json(
      { error: "Submissions are temporarily unavailable" },
      { status: 503 },
    );
  }

  // The row is in. A picture that didn't upload goes to the team by email.
  let attached = true;
  for (const q of files) {
    try {
      await attachFile(row.id!, q.field!, answers[q.key] as FileAnswer);
    } catch (err) {
      attached = false;
      console.error(`[forms] ${def.slug}: attachment failed:`, err);
    }
  }
  if (!attached)
    await backUp(`The row saved (${row.id}), but its picture didn't upload.`);
  return NextResponse.json({ ok: true, stored: true, attached });
}
