import { fetchRfpRecord, intakeRfp, RECORD_ID } from "@/lib/rfp-intake-store";
import {
  authorize,
  done,
  error,
  failed,
  json,
  readBody,
} from "@/lib/schedule-api";

export const dynamic = "force-dynamic";

/**
 * `{recordId}` of an RFP Submissions row, sent by the Airtable automation when
 * a proposal comes in. The record is read from Airtable here, never from the
 * body. Makes its draft session, or on a re-send fills only empty columns.
 */
export async function POST(request: Request) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { recordId } = body;
  if (typeof recordId !== "string" || !RECORD_ID.test(recordId)) {
    return error("recordId must be an Airtable record id.", 400, "recordId");
  }
  try {
    const fields = await fetchRfpRecord(recordId);
    if (!fields) {
      return error(`No RFP submission ${recordId}.`, 404, "recordId");
    }
    const result = await intakeRfp(recordId, fields);
    done();
    return json(result, result.created ? 201 : 200);
  } catch (err) {
    return failed(err);
  }
}
