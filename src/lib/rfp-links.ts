import { airtableConfig } from "./airtable-config";

/** A session's grading page. */
export const gradeLink = (sessionId: string) => `/grade/${sessionId}`;

/** The Airtable RFP Submissions row a session was imported from. */
export const airtableRfpLink = (recordId: string) =>
  `https://airtable.com/${airtableConfig.baseId}/${airtableConfig.rfpSubmissionsTableId}/${recordId}`;
