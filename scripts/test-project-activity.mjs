import test from "node:test";
import assert from "node:assert/strict";
import { collectProjectActivity, normalizeCommit, statusFromActivity } from "./lib/project-activity.mjs";

const now = new Date("2026-09-07T12:00:00Z");
const project = { id: "demo", name: "DEMO", repo: "owner/demo" };
const commit = (i, date = "2026-09-06T12:00:00Z") => ({
  sha: i.toString(16).padStart(40, "0"),
  commit: { message: "fix: handle <empty> & retries\n\nbody", committer: { date }, author: { name: "A" } },
  author: { login: "contributor" },
});

test("counts beyond one page, deduplicates SHAs and enforces the exact 7-day window", async () => {
  const calls = [];
  const request = async (path) => {
    const url = new URL(path, "https://api.github.com"); calls.push(url);
    if (url.searchParams.get("per_page") === "3") return { data: [commit(5)] };
    if (url.searchParams.get("page") === "1") return { data: Array.from({ length: 100 }, (_, i) => commit(i)) };
    return { data: [commit(99), commit(100), commit(101, "2026-08-01T00:00:00Z"), commit(102, "2026-09-08T00:00:00Z")] };
  };
  const result = await collectProjectActivity(request, project, now);
  assert.equal(result.commitsLast7Days, 101);
  assert.equal(calls[1].searchParams.get("since"), "2026-08-31T12:00:00.000Z");
  assert.equal(calls[1].searchParams.get("until"), now.toISOString());
  assert.equal(result.recent[0].title, "fix: handle <empty> & retries");
});

test("empty repositories stay empty; a failed API read cannot silently fabricate zero activity", async () => {
  const empty = await collectProjectActivity(async () => ({ data: [] }), project, now);
  assert.equal(empty.commitsLast7Days, 0);
  const status = statusFromActivity({ username: "owner", generatedAt: now.toISOString(), projects: [empty] }, [project]);
  assert.match(status.text, /awaiting first commit · 0 default-branch commits/);
  await assert.rejects(collectProjectActivity(async () => { throw new Error("rate limit"); }, project, now), /rate limit/);
});

test("status selects observed latest activity without inventing shipping or a version", () => {
  const activity = { username: "owner", generatedAt: now.toISOString(), projects: [
    { id: "demo", commitsLast7Days: 1, recent: [normalizeCommit(commit(1), project.repo)] },
    { id: "other", commitsLast7Days: 2, recent: [normalizeCommit(commit(2, "2026-09-07T01:00:00Z"), "owner/other")] },
  ] };
  const status = statusFromActivity(activity, [project, { id: "other", name: "OTHER" }]);
  assert.equal(status.text, "$ status: latest OTHER · 3 default-branch commits / 7d");
  assert.match(status.scope, /Default branches of 2 selected repositories; all authors/);
  assert.match(status.url, /owner\/other\/commit\//);
});
