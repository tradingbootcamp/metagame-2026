"use client";

import { useActionState, useState } from "react";
import { fieldClass, buttonClass } from "../../ui";
import { importQuestCsv, type ImportState } from "../actions";

export default function ImportForm() {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState<ImportState, FormData>(
    async (prev, formData) => {
      const result = await importQuestCsv(prev, formData);
      // Cleared so a second submit cannot add the code-less rows twice.
      if (result.done) setText("");
      return result;
    },
    {},
  );
  return (
    <form action={action} aria-busy={pending} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-navy">
          Paste CSV or spreadsheet rows
        </span>
        <textarea
          name="csv"
          required
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder={
            "code,title,class,kind,answers,evidence,hint,min_level,max_level\n,The riddle,wizard,answer,fire|flame,,,1,2"
          }
          className={`${fieldClass} font-space-mono text-sm`}
        />
      </label>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Importing…" : "Import quests"}
      </button>
      {state.errors && state.errors.length > 0 && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-meeple">
          <p className="font-semibold">Nothing was imported.</p>
          <ul className="list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {state.done && (
        <p role="status" className="text-sm text-navy">
          {state.done}
        </p>
      )}
    </form>
  );
}
