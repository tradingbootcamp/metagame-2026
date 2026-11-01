"use client";

import { smallButtonClass, useCopy } from "../ui";

export default function GuideActions({ markdown }: { markdown: string }) {
  const { status, copy } = useCopy();
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([markdown], { type: "text/markdown" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "metagame-api.md";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => copy(markdown)}
        className={smallButtonClass}
      >
        {status === "copied"
          ? "Copied"
          : status === "failed"
            ? "Couldn’t copy"
            : "Copy agent guide"}
      </button>
      <button type="button" onClick={download} className={smallButtonClass}>
        Download .md
      </button>
    </div>
  );
}
