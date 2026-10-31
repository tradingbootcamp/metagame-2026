"use client";

import { useState } from "react";
import {
  days,
  scheduleLocations,
  type Session,
} from "@/v2/lib/last-year-schedule";
import { LEGEND, sessionStyle } from "@/v2/lib/schedule-styles";
import LastYearSessionModal from "../schedule/LastYearSessionModal";
import Moments, { type MomentsDay } from "../schedule/Moments";

type LastYearMoment = Session & {
  startsAt: string;
  endsAt: string;
  locationId: string | null;
};

const MOMENT_DAYS: MomentsDay<LastYearMoment>[] = days.map((d) => ({
  key: d.key,
  name: d.name,
  slots: d.slots,
  sessions: d.sessions.map((s) => ({
    ...s,
    startsAt: s.start_time,
    endsAt: s.end_time,
    locationId: s.location_id,
  })),
}));

// The 2025 weekend on the Moments board, with last year's session cards.
export default function WhatWasOn() {
  const [open, setOpen] = useState<{ session: Session; day: string } | null>(
    null,
  );
  return (
    <>
      <Moments
        days={MOMENT_DAYS}
        locations={scheduleLocations}
        styleFor={sessionStyle}
        legend={LEGEND}
        onOpen={(session, day) => setOpen({ session, day: day.name })}
      />
      {open && (
        <LastYearSessionModal
          session={open.session}
          dayName={open.day}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
