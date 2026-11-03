import { describe, expect, it } from "vitest";
import {
  closeSessionHref,
  openSessionHref,
  sessionPageSlug,
} from "./session-link";

describe("sessionPageSlug", () => {
  it("reads the slug off a session's own page", () => {
    expect(sessionPageSlug("/schedule/chess-variants")).toBe("chess-variants");
    expect(sessionPageSlug("/schedule/caf%C3%A9")).toBe("café");
  });

  it("is null anywhere else", () => {
    expect(sessionPageSlug("/schedule")).toBeNull();
    expect(sessionPageSlug("/")).toBeNull();
    expect(sessionPageSlug("/account/sessions/abc")).toBeNull();
  });
});

describe("openSessionHref", () => {
  it("adds the param to the current page", () => {
    expect(openSessionHref("/", "chess")).toBe("/?session=chess");
    expect(openSessionHref("/u/abc", "chess")).toBe("/u/abc?session=chess");
  });

  it("keeps the page's other params", () => {
    expect(openSessionHref("/account", "chess", "tab=sessions")).toBe(
      "/account?tab=sessions&session=chess",
    );
    expect(
      openSessionHref("/account", "go", "?tab=sessions&session=chess"),
    ).toBe("/account?tab=sessions&session=go");
  });

  it("opens over /schedule from a session's own page", () => {
    expect(openSessionHref("/schedule/chess", "go")).toBe(
      "/schedule?session=go",
    );
  });
});

describe("closeSessionHref", () => {
  it("drops only the session param", () => {
    expect(closeSessionHref("/schedule", "session=chess")).toBe("/schedule");
    expect(closeSessionHref("/account", "tab=sessions&session=chess")).toBe(
      "/account?tab=sessions",
    );
    expect(closeSessionHref("/", "")).toBe("/");
  });
});
