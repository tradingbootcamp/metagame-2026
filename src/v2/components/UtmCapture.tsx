"use client";

import { useEffect } from "react";
import { captureUtm, stripUtmFromUrl } from "@/lib/utm";

export default function UtmCapture() {
  useEffect(() => {
    captureUtm(window.location.search);
    stripUtmFromUrl();
  }, []);
  return null;
}
