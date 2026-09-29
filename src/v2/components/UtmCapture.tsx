"use client";

import { useEffect } from "react";
import { captureFirstTouchUtm } from "@/lib/utm";

export default function UtmCapture() {
  useEffect(() => captureFirstTouchUtm(window.location.search), []);
  return null;
}
