"use client";

import { useActionState } from "react";
import {
  savePassword,
  signOut,
  updateProfile,
  type FormState,
} from "./actions";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import { FIELD_LIGHT } from "@/v2/components/styles";
import { cn } from "@/v2/lib/utils";

const initial: FormState = {};

const LABEL = "text-sm font-semibold text-navy";
const TEXTAREA = cn(
  "min-h-28 w-full rounded-lg border-[1.5px] px-4 py-3 text-base transition-colors outline-none disabled:opacity-60",
  FIELD_LIGHT,
);

function Status({ state, saved }: { state: FormState; saved: string }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm">
      {state.error ? (
        <span className="text-meeple">{state.error}</span>
      ) : state.saved ? (
        <span className="text-ink/70">{saved}</span>
      ) : null}
    </p>
  );
}

export type ProfileValues = {
  name: string;
  preferredName: string;
  pronouns: string;
  discordHandle: string;
  bio: string;
  isPublic: boolean;
};

export function ProfileForm({
  initialValues,
}: {
  initialValues: ProfileValues;
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const v = initialValues;

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="font-grotesk text-2xl font-bold text-navy">Profile</h2>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Name</span>
        <Input
          name="name"
          defaultValue={v.name}
          autoComplete="name"
          required
          maxLength={80}
          className={FIELD_LIGHT}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Preferred name</span>
        <Input
          name="preferredName"
          defaultValue={v.preferredName}
          placeholder="What your badge should say"
          maxLength={80}
          className={FIELD_LIGHT}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Pronouns</span>
          <Input
            name="pronouns"
            defaultValue={v.pronouns}
            maxLength={40}
            className={FIELD_LIGHT}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Discord handle</span>
          <Input
            name="discordHandle"
            defaultValue={v.discordHandle}
            maxLength={40}
            className={FIELD_LIGHT}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Bio</span>
        <textarea
          name="bio"
          defaultValue={v.bio}
          maxLength={1000}
          className={TEXTAREA}
        />
      </label>
      <label className="flex items-center gap-2.5 text-base text-ink">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={v.isPublic}
          className="size-4 accent-meeple"
        />
        Show my profile to other attendees
      </label>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save profile"}
      </Button>
      <Status state={state} saved="Saved." />
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(savePassword, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="font-grotesk text-2xl font-bold text-navy">
        {hasPassword ? "Change password" : "Set a password"}
      </h2>
      <p className="text-sm text-ink/70">
        {hasPassword
          ? "Forgot it? Sign out, sign in with a code, and set a new one here."
          : "Optional. You can always sign in with an emailed code instead."}
      </p>
      {hasPassword && (
        <Input
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          placeholder="Current password"
          required
          className={FIELD_LIGHT}
        />
      )}
      <Input
        type="password"
        name="newPassword"
        autoComplete="new-password"
        placeholder="New password (8+ characters)"
        required
        minLength={8}
        className={FIELD_LIGHT}
      />
      <Input
        type="password"
        name="confirm"
        autoComplete="new-password"
        placeholder="Repeat new password"
        required
        minLength={8}
        className={FIELD_LIGHT}
      />
      <Button
        type="submit"
        variant="navy"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
      </Button>
      <Status state={state} saved="Password saved." />
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        className="border-navy/40 text-navy"
      >
        Sign out
      </Button>
    </form>
  );
}
