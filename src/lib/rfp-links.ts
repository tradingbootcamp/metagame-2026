import { airtableConfig } from "./airtable-config";

/** Where an RFP submission lives: its grading page and its Airtable row. */
export const rfpLinks = (recordId: string) => ({
  grade: `/grade/${recordId}`,
  airtable: `https://airtable.com/${airtableConfig.baseId}/${airtableConfig.rfpSubmissionsTableId}/${recordId}`,
});
