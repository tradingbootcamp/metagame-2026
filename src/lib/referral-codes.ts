// Short referral links: metagame.games/r/<code> → /?utm_source=…&utm_medium=…&utm_campaign=…
// Codes are matched case-insensitively; keep keys lowercase.

type ReferralUtm = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

export const REFERRAL_CODES: Record<string, ReferralUtm> = {
  brian: {
    utm_source: "brian",
    utm_medium: "referral",
    utm_campaign: "friends",
  },
  twitter: {
    utm_source: "twitter",
    utm_medium: "social",
    utm_campaign: "launch",
  },
};

/** Path + query to redirect a referral code to; unknown codes go to `/`. */
export function referralRedirectPath(code: string): string {
  const key = code.toLowerCase();
  if (!Object.hasOwn(REFERRAL_CODES, key)) return "/";
  return `/?${new URLSearchParams(REFERRAL_CODES[key])}`;
}
