import GetTokensDialog from "./GetTokensDialog";
import type { Balance } from "@/lib/token-store";

export default function MagnumOpusPanel({
  balance,
  volunteers,
  ticketed,
  cap,
  lending,
}: {
  balance: Balance;
  volunteers: string[];
  ticketed: boolean;
  cap: number;
  lending: boolean;
}) {
  return (
    <section
      aria-labelledby="magnum-opus-tokens"
      className="flex max-w-[960px] flex-col gap-2"
    >
      <h2
        id="magnum-opus-tokens"
        className="font-grotesk text-2xl font-bold text-navy"
      >
        Tokens
      </h2>
      <p className="font-[family-name:var(--font-bebas)] text-[clamp(48px,8vw,80px)] leading-none tracking-[0.02em] text-navy tabular-nums">
        {balance.tokens.toLocaleString("en-US")}
      </p>
      {balance.loanTokens > 0 && (
        <p className="font-space-mono text-sm font-bold tracking-[0.08em] text-meeple uppercase">
          Loan outstanding: {balance.loanTokens.toLocaleString("en-US")}
        </p>
      )}
      <div className="mt-4">
        <GetTokensDialog
          volunteers={volunteers}
          ticketed={ticketed}
          loanTokens={balance.loanTokens}
          cap={cap}
          lending={lending}
        />
      </div>
    </section>
  );
}
