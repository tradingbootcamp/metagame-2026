"use client";

import { useEffect } from "react";
import { captureFirstTouchUtm, stripUtmFromUrl } from "@/lib/utm";

export default function UtmCapture() {
  useEffect(() => {
    captureFirstTouchUtm(window.location.search);
    stripUtmFromUrl();
  }, []);
  return null;
}
