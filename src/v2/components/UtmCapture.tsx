"use client";

import { useEffect } from "react";
import { captureUtm, stripUtmFromUrl } from "@/lib/utm";
import { capturePosterDiscounts } from "@/lib/poster-discount-session";

export default function UtmCapture() {
  useEffect(() => {
    captureUtm(window.location.search);
    capturePosterDiscounts(window.location.search);
    stripUtmFromUrl();
  }, []);
  return null;
}
