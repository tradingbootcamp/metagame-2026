const PACIFIC: Intl.DateTimeFormatOptions = {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

export const pacific = (ms: number) =>
  new Date(ms).toLocaleString("en-US", PACIFIC);
