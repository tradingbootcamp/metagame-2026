import Link from "next/link";
import { connection } from "next/server";
import SignIn from "../../SignIn";
import { when } from "../format";
import Section from "../Section";
import AutoRefresh from "./AutoRefresh";
import {
  ANY_CLASS_COLOR,
  CLASS_COLORS,
  InlineBar,
  Legend,
  StackedBars,
} from "./charts";
import { fillSeries } from "./series";
import {
  RANGE_LABELS,
  RANGE_PRESETS,
  dashboardView,
  viewHref,
  type DashboardView,
} from "./view";
import { toolAccess } from "@/lib/admin-auth";
import {
  CLASS_LABELS,
  MAX_LEVEL,
  MEGAGAME_CLASSES,
  isMegagameClass,
  type MegagameClass,
} from "@/lib/megagame-levels";
import {
  BUCKET_MINUTES,
  BUCKET_SIZES,
  EVENT_TABLES,
  cumulativeLevelDistribution,
  type BucketSize,
} from "@/lib/megagame-rules";
import {
  claimedTicketHolderCount,
  completionSeries,
  completionsByVolunteer,
  distinctCompletingPlayers,
  levelEventSeries,
  levelGrid,
  liveLevelEventsBefore,
  questCompletionCounts,
  recentOverrides,
  recentVoids,
  type VoidRow,
} from "@/lib/megagame-store";
import { PACIFIC } from "@/lib/schedule";
import { formatTicketCode } from "@/lib/ticket-code-format";

const REFRESH_SECONDS = 60;
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

const TABLE = "w-full border-collapse text-sm";
const TH = "border-b border-line px-2 py-1.5 text-left font-semibold text-navy";
const THN = `${TH} text-right`;
const TD = "border-b border-line px-2 py-1.5 align-top";
const TDN = `${TD} text-right tabular-nums`;
const BOX = "overflow-x-auto rounded-xl border border-line bg-white p-2";
const PICK =
  "rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors";
const PICK_ON = `${PICK} border-navy bg-navy text-white`;
const PICK_OFF = `${PICK} border-line bg-white text-navy hover:border-navy`;
const NOTE = "text-sm text-ink/60";

const DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC,
  weekday: "short",
  month: "short",
  day: "numeric",
});
const TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC,
  hour: "numeric",
  minute: "2-digit",
});

const bucketLabel = (at: Date, size: BucketSize) =>
  size === "1d" ? DAY.format(at) : when(at);

const pct = (n: number, of: number) =>
  of > 0 ? `${Math.round((n / of) * 100)}%` : "–";

const classLabel = (c: string | null) =>
  c === null ? "Any class" : isMegagameClass(c) ? CLASS_LABELS[c] : c;

const COMPLETION_SERIES = [
  ...MEGAGAME_CLASSES.map((c) => ({
    name: CLASS_LABELS[c],
    color: CLASS_COLORS[c],
  })),
  { name: "Any class", color: ANY_CLASS_COLOR },
];
const CLASS_SERIES = MEGAGAME_CLASSES.map((c) => ({
  name: CLASS_LABELS[c],
  color: CLASS_COLORS[c],
}));

export default async function DashboardPage(
  props: PageProps<"/backstage/megagame/dashboard">,
) {
  await connection();
  const sp = await props.searchParams;
  const now = new Date();
  const view = dashboardView(sp, now);

  const access = await toolAccess("megagame.verify");
  if (!access) return <SignIn next={viewHref(view, {})} />;

  const series = !view.tooMany;
  const [
    grid,
    holders,
    quests,
    players,
    volunteers,
    completions,
    levelEvents,
    history,
    overrides,
    voids,
  ] = await Promise.all([
    levelGrid(),
    claimedTicketHolderCount(),
    questCompletionCounts(),
    distinctCompletingPlayers(),
    completionsByVolunteer(),
    series ? completionSeries(view.size, view.from, view.to) : [],
    series ? levelEventSeries(view.size, view.from, view.to) : [],
    series ? liveLevelEventsBefore(view.to) : [],
    recentOverrides(),
    recentVoids(),
  ]);

  const rows = fillSeries(view.buckets, completions, levelEvents);
  const step = BUCKET_MINUTES[view.size] * 60000;
  const ends = view.buckets.map(
    (b) => new Date(Math.min(b.getTime() + step, view.to.getTime())),
  );
  const cumulative = cumulativeLevelDistribution(history, ends);

  const total = quests.reduce((a, q) => a + q.n, 0);
  const byClass = new Map<string | null, number>();
  for (const q of quests)
    byClass.set(q.class, (byClass.get(q.class) ?? 0) + q.n);
  const classRows = [...MEGAGAME_CLASSES, null].map((c) => ({
    c,
    n: byClass.get(c) ?? 0,
  }));
  const questMax = Math.max(0, ...quests.map((q) => q.n));
  const volunteerMax = Math.max(0, ...volunteers.map((v) => v.n));
  const classMax = Math.max(0, ...classRows.map((r) => r.n));

  return (
    <div className="flex w-[min(64rem,calc(100vw-2rem))] flex-col gap-10 self-center">
      <AutoRefresh seconds={REFRESH_SECONDS} />
      <div className="flex flex-col gap-1">
        <h1 className="font-bebas text-3xl tracking-wide text-navy">
          Dashboard
        </h1>
        <p className={NOTE}>
          Updated {TIME.format(now)}. The page refreshes every minute.
        </p>
      </div>

      <Section title="Levels">
        <div className={BOX}>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>Level</th>
                {MEGAGAME_CLASSES.map((c) => (
                  <th key={c} className={THN}>
                    {CLASS_LABELS[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((level) => (
                <tr key={level}>
                  <td className={TD}>{level}</td>
                  {MEGAGAME_CLASSES.map((c) => (
                    <td key={c} className={TDN}>
                      {grid[c][level]}{" "}
                      <span className="text-ink/50">
                        ({pct(grid[c][level], holders)})
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={TD}>In class</td>
                {MEGAGAME_CLASSES.map((c) => {
                  const n = grid[c].reduce((a, b) => a + b, 0);
                  return (
                    <td key={c} className={TDN}>
                      {n}{" "}
                      <span className="text-ink/50">({pct(n, holders)})</span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <p className={NOTE}>
          Players at each current level. Percentages are of the {holders}{" "}
          accounts that have claimed a ticket. There is no check-in data, so
          that is not a count of people at the con, and staff without a ticket
          can push a percentage up.
        </p>
      </Section>

      <Section title="Quests">
        <p className="text-navy">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>{" "}
          completions by{" "}
          <span className="text-2xl font-semibold tabular-nums">{players}</span>{" "}
          {players === 1 ? "player" : "players"}.
        </p>
        <p className={NOTE}>
          Voided completions are left out. Deleted accounts count as one player.
        </p>

        <h3 className="font-semibold text-navy">By class</h3>
        <div className={BOX}>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>Quest class</th>
                <th className={THN}>Completions</th>
                <th className={`${TH} w-1/3`}>
                  <span className="sr-only">Bar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {classRows.map(({ c, n }) => (
                <tr key={c ?? "any"}>
                  <td className={TD}>{classLabel(c)}</td>
                  <td className={TDN}>{n}</td>
                  <td className={TD}>
                    <InlineBar value={n} max={classMax} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-semibold text-navy">By quest</h3>
        {quests.length === 0 ? (
          <p className={NOTE}>No quests yet.</p>
        ) : (
          <div className={BOX}>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>Quest</th>
                  <th className={TH}>Class</th>
                  <th className={THN}>Completions</th>
                  <th className={`${TH} w-1/4`}>
                    <span className="sr-only">Bar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {quests.map((q) => (
                  <tr key={q.id}>
                    <td className={TD}>
                      <Link
                        href={`/backstage/megagame/q/${q.code}`}
                        className="text-navy underline-offset-2 hover:text-meeple hover:underline"
                      >
                        {q.title}
                      </Link>{" "}
                      <span className="font-mono text-xs whitespace-nowrap text-ink/50">
                        {formatTicketCode(q.code)}
                      </span>
                      {!q.active && (
                        <span className="ml-1 text-xs text-ink/50">
                          (inactive)
                        </span>
                      )}
                    </td>
                    <td className={TD}>{classLabel(q.class)}</td>
                    <td className={TDN}>{q.n}</td>
                    <td className={TD}>
                      <InlineBar value={q.n} max={questMax} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="font-semibold text-navy">By volunteer</h3>
        {volunteers.length === 0 ? (
          <p className={NOTE}>No completions yet.</p>
        ) : (
          <div className={BOX}>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>Volunteer</th>
                  <th className={THN}>Completions</th>
                  <th className={`${TH} w-1/3`}>
                    <span className="sr-only">Bar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((v) => (
                  <tr key={v.userId ?? "deleted"}>
                    <td className={TD}>{v.name ?? "Deleted account"}</td>
                    <td className={TDN}>{v.n}</td>
                    <td className={TD}>
                      <InlineBar value={v.n} max={volunteerMax} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Over time">
        <Pickers view={view} />
        {view.tooMany ? (
          <p role="alert" className="text-sm text-meeple">
            {RANGE_LABELS[view.preset]} in {view.size} buckets is too many rows
            to show. Pick a bigger bucket.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-navy">Quest completions</h3>
              <Legend series={COMPLETION_SERIES} />
              <StackedBars
                label="Quest completions per bucket, by quest class"
                series={COMPLETION_SERIES}
                rows={rows.map((r) => ({
                  label: bucketLabel(r.start, view.size),
                  values: [
                    ...MEGAGAME_CLASSES.map((c) => r.completions[c]),
                    r.completions.any,
                  ],
                }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-navy">Level-ups</h3>
              <Legend series={CLASS_SERIES} />
              <StackedBars
                label="Volunteer level-ups per bucket, by class"
                series={CLASS_SERIES}
                rows={rows.map((r) => ({
                  label: bucketLabel(r.start, view.size),
                  values: MEGAGAME_CLASSES.map((c) => r.levelUps[c]),
                }))}
              />
            </div>
            <details open={rows.length <= 24} className="flex flex-col gap-2">
              <summary className="cursor-pointer font-semibold text-navy">
                Table
              </summary>
              <div className={`${BOX} mt-2`}>
                <table className={TABLE}>
                  <thead>
                    <tr>
                      <th className={TH} rowSpan={2}>
                        Bucket start
                      </th>
                      <th className={`${TH} text-center`} colSpan={5}>
                        Completions
                      </th>
                      <th className={`${TH} text-center`} colSpan={4}>
                        Level-ups
                      </th>
                      <th className={THN} rowSpan={2}>
                        Joins
                      </th>
                    </tr>
                    <tr>
                      {MEGAGAME_CLASSES.map((c) => (
                        <th key={c} className={THN}>
                          {CLASS_LABELS[c]}
                        </th>
                      ))}
                      <th className={THN}>Any</th>
                      <th className={THN}>Total</th>
                      {MEGAGAME_CLASSES.map((c) => (
                        <th key={c} className={THN}>
                          {CLASS_LABELS[c]}
                        </th>
                      ))}
                      <th className={THN}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.start.getTime()}>
                        <td className={`${TD} whitespace-nowrap`}>
                          {bucketLabel(r.start, view.size)}
                        </td>
                        {MEGAGAME_CLASSES.map((c) => (
                          <td key={c} className={TDN}>
                            {r.completions[c]}
                          </td>
                        ))}
                        <td className={TDN}>{r.completions.any}</td>
                        <td className={`${TDN} font-semibold`}>
                          {r.completionTotal}
                        </td>
                        {MEGAGAME_CLASSES.map((c) => (
                          <td key={c} className={TDN}>
                            {r.levelUps[c]}
                          </td>
                        ))}
                        <td className={`${TDN} font-semibold`}>
                          {r.levelUpTotal}
                        </td>
                        <td className={TDN}>{r.joinTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className={NOTE}>
              Times are Pacific. Day buckets start at midnight Pacific standard
              time. Joins are faction picks on the account page. Voided records
              are left out.
            </p>
          </>
        )}
      </Section>

      {!view.tooMany && (
        <Section title="Levels over time">
          <div className="flex flex-wrap gap-2">
            {MEGAGAME_CLASSES.map((c) => (
              <Link
                key={c}
                href={viewHref(view, { cls: c })}
                replace
                scroll={false}
                className={c === view.cls ? PICK_ON : PICK_OFF}
              >
                {CLASS_LABELS[c]}
              </Link>
            ))}
          </div>
          <CumulativeTable
            view={view}
            cls={view.cls}
            ends={ends}
            cumulative={cumulative}
          />
          <p className={NOTE}>
            {CLASS_LABELS[view.cls]} players at each level as of the end of each
            bucket, counted from the level-up log rather than the current level
            columns, so the last row can differ slightly from the table at the
            top.
          </p>
        </Section>
      )}

      <Section title="Recent overrides">
        {overrides.length === 0 ? (
          <p className={NOTE}>No level-ups recorded past failing checks.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
            {overrides.map((o) => (
              <li key={o.id} className="flex flex-col gap-0.5 p-3 text-sm">
                <p className="text-navy">
                  <span className="font-medium">
                    {o.playerName ?? "Deleted account"}
                  </span>{" "}
                  to level {o.level} {classLabel(o.class)}
                  {o.voidedAt && <span className="text-ink/50"> (undone)</span>}
                </p>
                <p className="text-ink/60">
                  {when(o.awardedAt)} by{" "}
                  {o.awardedByName ?? "a deleted account"}
                  {o.overrideReason ? `: ${o.overrideReason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent voids">
        {voids.length === 0 ? (
          <p className={NOTE}>Nothing has been undone.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
            {voids.map((v) => (
              <li
                key={`${v.kind}-${v.id}`}
                className="flex flex-col gap-0.5 p-3 text-sm"
              >
                <p className="text-navy">{voidText(v)}</p>
                <p className="text-ink/60">
                  {when(v.voidedAt)} by {v.voidedByName ?? "a deleted account"}
                  {v.reason ? `: ${v.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Export">
        <ul className="flex flex-col gap-2">
          {EVENT_TABLES.map((t) => (
            <li key={t}>
              <a
                href={`/backstage/megagame/dashboard/export/${t}`}
                download
                className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
              >
                {t}.csv
              </a>
            </li>
          ))}
        </ul>
        <p className={NOTE}>
          Every row, voided ones included, with names joined in.
        </p>
      </Section>
    </div>
  );
}

function voidText(v: VoidRow): string {
  const player = v.playerName ?? "a deleted account";
  if (v.kind === "confirmation") return `Confirmation of ${v.questTitle}`;
  if (v.kind === "completion") return `${player} on ${v.questTitle}`;
  return `${player} at level ${v.level} ${classLabel(v.class)}`;
}

function Pickers({ view }: { view: DashboardView }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" aria-label="Range">
        {RANGE_PRESETS.map((p) => (
          <Link
            key={p}
            href={viewHref(view, { range: p })}
            replace
            scroll={false}
            className={p === view.preset ? PICK_ON : PICK_OFF}
          >
            {RANGE_LABELS[p]}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Bucket size">
        {BUCKET_SIZES.map((s) => (
          <Link
            key={s}
            href={viewHref(view, { bucket: s })}
            replace
            scroll={false}
            className={s === view.size ? PICK_ON : PICK_OFF}
          >
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}

function CumulativeTable({
  view,
  cls,
  ends,
  cumulative,
}: {
  view: DashboardView;
  cls: MegagameClass;
  ends: Date[];
  cumulative: Record<MegagameClass, number[]>[];
}) {
  const label = (at: Date) =>
    view.size === "1d" ? DAY.format(new Date(at.getTime() - 1)) : when(at);
  return (
    <div className={BOX}>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>As of</th>
            {LEVELS.map((l) => (
              <th key={l} className={THN}>
                {l}
              </th>
            ))}
            <th className={THN}>In class</th>
          </tr>
        </thead>
        <tbody>
          {cumulative.map((d, i) => (
            <tr key={ends[i].getTime()}>
              <td className={`${TD} whitespace-nowrap`}>
                {label(ends[i])}
                {view.size === "1d" && " (end)"}
              </td>
              {LEVELS.map((l) => (
                <td key={l} className={TDN}>
                  {d[cls][l]}
                </td>
              ))}
              <td className={`${TDN} font-semibold`}>
                {d[cls].reduce((a, b) => a + b, 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
