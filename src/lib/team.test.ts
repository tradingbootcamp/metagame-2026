import { describe, expect, it } from "vitest";
import {
  byDue,
  dutiesOf,
  findPerson,
  pacificToday,
  parseBoardFile,
  parseNameList,
  seatsLeft,
  staffing,
  summarize,
  toBoardFile,
  type Board,
  type Person,
  type Role,
  type Task,
} from "./team";

const person = (id: string, name: string, over: Partial<Person> = {}) =>
  ({
    id,
    name,
    kind: "volunteer",
    areaId: null,
    userId: null,
    account: null,
    contact: null,
    note: null,
    ...over,
  }) satisfies Person;

const role = (id: string, over: Partial<Role> = {}) =>
  ({
    id,
    title: id,
    areaId: null,
    leadId: null,
    description: null,
    skills: null,
    needed: 1,
    due: null,
    dueOn: null,
    status: "active",
    holders: [],
    interested: [],
    ...over,
  }) satisfies Role;

const task = (id: string, over: Partial<Task> = {}) =>
  ({
    id,
    title: id,
    areaId: null,
    roleId: null,
    ownerId: null,
    status: "todo",
    dueOn: null,
    ...over,
  }) satisfies Task;

const board = (over: Partial<Board>): Board => ({
  areas: [],
  people: [],
  roles: [],
  tasks: [],
  volunteerAccounts: [],
  ...over,
});

describe("staffing", () => {
  it("is open with nobody, short with some, filled with enough", () => {
    expect(staffing(role("a", { needed: 2 }))).toBe("open");
    expect(staffing(role("a", { needed: 2, holders: ["p"] }))).toBe("short");
    expect(staffing(role("a", { needed: 2, holders: ["p", "q"] }))).toBe(
      "filled",
    );
  });

  it("treats needed 0 as anyone welcome, ongoing once someone holds it", () => {
    expect(staffing(role("a", { needed: 0 }))).toBe("open");
    expect(staffing(role("a", { needed: 0, holders: ["p"] }))).toBe("ongoing");
  });

  it("closes done and dropped roles whoever holds them", () => {
    expect(staffing(role("a", { status: "done" }))).toBe("closed");
    expect(staffing(role("a", { status: "dropped", holders: ["p"] }))).toBe(
      "closed",
    );
  });
});

describe("seatsLeft", () => {
  it("counts the empty seats, one for an unheld anyone-role", () => {
    expect(seatsLeft(role("a", { needed: 3, holders: ["p"] }))).toBe(2);
    expect(seatsLeft(role("a", { needed: 0 }))).toBe(1);
    expect(seatsLeft(role("a", { needed: 0, holders: ["p"] }))).toBe(0);
    expect(seatsLeft(role("a", { needed: 2, status: "done" }))).toBe(0);
  });
});

describe("summarize", () => {
  const ben = person("ben", "Ben Karcher", { kind: "staff" });
  const river = person("river", "River");
  const sam = person("sam", "Sam");
  const b = board({
    people: [ben, river, sam],
    roles: [
      role("handbook", { dueOn: "2026-11-04", leadId: "ben" }),
      role("gophers", { needed: 3, holders: ["river"], dueOn: "2026-10-01" }),
      role("signage", { holders: ["ben"] }),
      role("closing", { status: "dropped" }),
    ],
    tasks: [
      task("flyers", { ownerId: "sam", dueOn: "2026-10-30" }),
      task("email", { dueOn: "2026-11-10" }),
      task("old", { ownerId: "river", status: "done", dueOn: "2026-10-01" }),
    ],
  });

  it("counts roles to fill, their seats, and tasks with no owner", () => {
    const s = summarize(b, "2026-10-31");
    expect(s).toMatchObject({
      people: 3,
      staff: 1,
      volunteers: 2,
      rolesToFill: 2,
      seats: 3,
      rolesFilled: 1,
      openTasks: 2,
      tasksWithoutOwner: 1,
    });
  });

  it("flags open tasks and unfilled roles past their date, not done ones", () => {
    // flyers (task) and gophers (role) are past; the done task doesn't count.
    expect(summarize(b, "2026-10-31").overdue).toBe(2);
  });

  it("counts people with no role and no open task as unplaced", () => {
    const s = summarize(
      board({ ...b, tasks: b.tasks.filter((t) => t.id !== "flyers") }),
      "2026-10-31",
    );
    expect(s.unplaced).toBe(1); // Sam
  });

  it("lists one person's duties", () => {
    const d = dutiesOf(b, "ben");
    expect(d.holds.map((r) => r.id)).toEqual(["signage"]);
    expect(d.leads.map((r) => r.id)).toEqual(["handbook"]);
  });
});

describe("findPerson", () => {
  const people = [
    { name: "Ben Karcher" },
    { name: "River Bellamy" },
    { name: "Sam Houk" },
    { name: "Sam" },
  ];

  it("matches the whole name, any case", () => {
    expect(findPerson("ben karcher", people)?.name).toBe("Ben Karcher");
  });

  it("matches a lone first name when only one person has it", () => {
    expect(findPerson("River", people)?.name).toBe("River Bellamy");
    expect(findPerson("Sam", people)?.name).toBe("Sam");
  });

  it("refuses to guess", () => {
    expect(findPerson("Jisk", people)).toBeNull();
    expect(findPerson("Ben Smith", people)).toBeNull();
  });
});

describe("parseBoardFile", () => {
  it("reads a hand-written file with defaults filled in", () => {
    const got = parseBoardFile(
      JSON.stringify({
        areas: ["Meta"],
        people: [{ name: " Ben  Karcher ", kind: "staff", area: "Meta" }],
        roles: [{ title: "Handbook writer", lead: "Ben", dueOn: "2026-11-04" }],
        tasks: [{ title: "Code of Conduct", owner: "Ricki" }],
      }),
    );
    expect("file" in got && got.file).toMatchObject({
      people: [{ name: "Ben Karcher", kind: "staff", area: "Meta" }],
      roles: [
        {
          title: "Handbook writer",
          needed: 1,
          status: "active",
          assigned: [],
          interested: [],
        },
      ],
      tasks: [{ title: "Code of Conduct", owner: "Ricki", status: "todo" }],
    });
  });

  it("names what's wrong", () => {
    expect(parseBoardFile("nope")).toEqual({
      error: "That isn't a board file: it doesn't read as JSON.",
    });
    expect(parseBoardFile(JSON.stringify({ roles: [{ title: "" }] }))).toEqual({
      error: "Role 1 has no title.",
    });
    expect(
      parseBoardFile(
        JSON.stringify({ tasks: [{ title: "X", dueOn: "Nov 4" }] }),
      ),
    ).toEqual({ error: "X: dates are YYYY-MM-DD." });
    expect(
      parseBoardFile(JSON.stringify({ roles: [{ title: "X", needed: -1 }] })),
    ).toEqual({ error: "X: needed is a whole number, 0 for anyone." });
  });

  it("reads back what Export writes", () => {
    const b = board({
      areas: [{ id: "a", name: "Meta", position: 0 }],
      people: [person("ben", "Ben Karcher", { kind: "staff", areaId: "a" })],
      roles: [role("r", { title: "Signage", holders: ["ben"], areaId: "a" })],
      tasks: [task("t", { title: "Budget", ownerId: "ben", roleId: "r" })],
    });
    const file = toBoardFile(b);
    expect(parseBoardFile(JSON.stringify(file))).toEqual({ file });
    expect(file.roles?.[0]).toMatchObject({
      area: "Meta",
      assigned: ["Ben Karcher"],
    });
    expect(file.tasks?.[0]).toMatchObject({
      owner: "Ben Karcher",
      role: "Signage",
    });
  });
});

describe("parseNameList", () => {
  it("takes one name a line, with an optional contact, once each", () => {
    expect(
      parseNameList("River Bellamy\n\nConnor, @connor\nriver bellamy\n"),
    ).toEqual([
      { name: "River Bellamy", contact: null },
      { name: "Connor", contact: "@connor" },
    ]);
  });
});

describe("byDue", () => {
  it("puts the soonest first and the undated last", () => {
    const sorted = [
      { name: "c", dueOn: null },
      { name: "b", dueOn: "2026-11-04" },
      { name: "a", dueOn: "2026-11-02" },
    ].sort(byDue((x) => x.name));
    expect(sorted.map((x) => x.name)).toEqual(["a", "b", "c"]);
  });
});

describe("pacificToday", () => {
  it("is the Pacific date, not UTC", () => {
    // 2026-11-03 06:00 UTC is still Nov 2 in Berkeley.
    expect(pacificToday(new Date("2026-11-03T06:00:00Z"))).toBe("2026-11-02");
  });
});
