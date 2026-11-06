export const BADGE_CODE_LENGTH = 4;

/** The badge number as printed and as its QR sticker encodes it: "0042". */
export const formatBadgeCode = (n: number) =>
  String(n).padStart(BADGE_CODE_LENGTH, "0");
