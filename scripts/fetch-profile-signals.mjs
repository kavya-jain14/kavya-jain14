import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const config = JSON.parse(readFileSync("data/profile-config.json", "utf8"));
const contributions = JSON.parse(readFileSync("data/contributions.json", "utf8"));
const outputPath = "data/profile-signals.json";
const token = process.env.GITHUB_TOKEN;
const username = process.env.PROFILE_USERNAME || config.username;

const headers = {
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  "user-agent": "kavya-profile-evidence-generator",
};
if (token) headers.authorization = `Bearer ${token}`;

async function request(path, options = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.github.com${path}`, { headers });
    if (options.allowEmptyRepository && response.status === 409) return { data: [], headers: response.headers };
    if (response.ok) return { data: await response.json(), headers: response.headers };
    const transient = response.status === 429 || response.status >= 500;
    if (transient && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
      continue;
    }
    throw new Error(`GitHub REST ${path} returned ${response.status}: ${await response.text()}`);
  }
  throw new Error(`GitHub REST ${path} exhausted its retry budget.`);
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

async function listOwnedRepositories() {
  const repositories = [];
  for (let page = 1; ; page += 1) {
    const { data } = await request(`/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&per_page=100&page=${page}`);
    repositories.push(...data);
    if (data.length < 100) break;
  }
  return repositories;
}

async function languageBytes(fullName) {
  const { data } = await request(`/repos/${fullName}/languages`);
  return data;
}

function lastPageCount(headers, fallback) {
  const link = headers.get("link") || "";
  const match = link.match(/[?&]page=(\d+)>; rel="last"/);
  return match ? Number(match[1]) : fallback;
}

async function authoredCommitCount(fullName) {
  const { data, headers: responseHeaders } = await request(
    `/repos/${fullName}/commits?author=${encodeURIComponent(username)}&per_page=1`,
    { allowEmptyRepository: true },
  );
  return lastPageCount(responseHeaders, data.length);
}

async function repositorySignals(project) {
  const [{ data: repository }, languages, commitCount] = await Promise.all([
    request(`/repos/${project.repo}`),
    languageBytes(project.repo),
    authoredCommitCount(project.repo),
  ]);
  return {
    id: project.id,
    repo: project.repo,
    pushedAt: repository.pushed_at,
    commitCount,
    languageBytes: Object.values(languages).reduce((sum, value) => sum + value, 0),
  };
}

async function recentDecisions(project) {
  const [commits, pulls] = await Promise.all([
    request(`/repos/${project.repo}/commits?author=${encodeURIComponent(username)}&per_page=5`, { allowEmptyRepository: true }),
    request(`/repos/${project.repo}/pulls?state=closed&sort=updated&direction=desc&per_page=10`),
  ]);
  const commitEvents = commits.data.map((entry) => ({
    at: entry.commit.author?.date || entry.commit.committer?.date,
    repo: project.name,
    kind: "COMMIT",
    message: entry.commit.message.split("\n")[0],
    url: entry.html_url,
  }));
  const pullEvents = pulls.data.filter((entry) => entry.merged_at).map((entry) => ({
    at: entry.merged_at,
    repo: project.name,
    kind: "MERGED PR",
    number: entry.number,
    message: entry.title,
    url: entry.html_url,
  }));
  return [...commitEvents, ...pullEvents];
}

const allOwnedRepositories = await listOwnedRepositories();
const ownedRepositories = allOwnedRepositories.filter((repository) => !repository.fork);
const ownedLanguages = await mapLimit(ownedRepositories, 5, async (repository) => ({
  repo: repository.full_name,
  languages: await languageBytes(repository.full_name),
}));

const aggregateLanguages = {};
for (const repository of ownedLanguages) {
  for (const [language, bytes] of Object.entries(repository.languages)) {
    aggregateLanguages[language] = (aggregateLanguages[language] || 0) + bytes;
  }
}
const languages = Object.entries(aggregateLanguages)
  .map(([name, bytes]) => ({ name, bytes }))
  .sort((left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name));
const totalLanguageBytes = languages.reduce((sum, language) => sum + language.bytes, 0);
for (const language of languages) language.share = totalLanguageBytes ? language.bytes / totalLanguageBytes : 0;

const rawProjectSignals = await mapLimit(config.projects, 3, repositorySignals);
const maxCommits = Math.max(1, ...rawProjectSignals.map((project) => Math.log1p(project.commitCount)));
const maxBytes = Math.max(1, ...rawProjectSignals.map((project) => Math.log1p(project.languageBytes)));
const now = new Date();
const projectSignals = rawProjectSignals.map((project) => {
  const ageDays = Math.max(0, (now - new Date(project.pushedAt)) / 86_400_000);
  const commitSignal = Math.log1p(project.commitCount) / maxCommits;
  const recencySignal = Math.exp(-ageDays / 240);
  const codeSignal = Math.log1p(project.languageBytes) / maxBytes;
  return {
    ...project,
    ageDays: Math.round(ageDays),
    signal: 0.45 * commitSignal + 0.3 * recencySignal + 0.25 * codeSignal,
  };
});

const rawEngineeringRange = config.engineeringAxes.map((axis) => {
  let weightedSignal = 0;
  for (const project of config.projects) {
    const weight = Number(project.axisWeights?.[axis] || 0);
    const signal = projectSignals.find((entry) => entry.id === project.id)?.signal || 0;
    weightedSignal += weight * signal;
  }
  return { label: axis, weightedSignal };
});
const strongestEngineeringAxis = Math.max(1, ...rawEngineeringRange.map((axis) => axis.weightedSignal));
const engineeringRange = rawEngineeringRange.map((axis) => ({
  label: axis.label,
  value: Math.min(0.98, 0.2 + 0.78 * Math.pow(axis.weightedSignal / strongestEngineeringAxis, 1.5)),
}));

const languageMaximum = Math.max(1, ...languages.slice(0, 6).map((language) => language.bytes));
const workingLanguages = languages.slice(0, 6).map((language) => ({
  label: language.name,
  bytes: language.bytes,
  share: language.share,
  value: Math.min(0.98, 0.3 + 0.68 * Math.sqrt(language.bytes / languageMaximum)),
}));

const decisionGroups = await mapLimit(config.projects, 3, recentDecisions);
const allDecisions = decisionGroups.flat();
const mergedPulls = allDecisions.filter((event) => event.kind === "MERGED PR");
const deduplicatedDecisions = allDecisions.filter((event) => {
  if (event.kind !== "COMMIT") return true;
  return !mergedPulls.some((pull) => pull.repo === event.repo && new RegExp(`#${pull.number}(\\D|$)`).test(event.message));
}).sort((left, right) => new Date(right.at) - new Date(left.at));
const decisionsPerRepo = new Map();
const decisionLog = deduplicatedDecisions
  .filter((event) => event.at)
  .filter((event) => {
    const count = decisionsPerRepo.get(event.repo) || 0;
    if (count >= 1) return false;
    decisionsPerRepo.set(event.repo, count + 1);
    return true;
  })
  .slice(0, 5);

const recentWeeks = contributions.weeks.slice(-52);
const currentMetrics = {
  publicRepos: allOwnedRepositories.length,
  contributions: contributions.total,
  activeWeeks: recentWeeks.filter((week) => week.total > 0).length,
  flagshipSystems: config.projects.filter((project) => project.flagship).length,
};
let previousMetrics = currentMetrics;
try {
  previousMetrics = JSON.parse(readFileSync(outputPath, "utf8")).metrics?.current || currentMetrics;
} catch {
  // A first run has no delta baseline. Zero deltas are more honest than guessed history.
}

const payload = {
  generatedAt: now.toISOString(),
  username,
  repositoryScope: "public, owned, non-fork repositories",
  languageRepositoryCount: ownedRepositories.length,
  languages,
  totalLanguageBytes,
  workingLanguages,
  engineeringRange,
  projectSignals,
  decisionLog,
  metrics: { current: currentMetrics, previous: previousMetrics },
};

mkdirSync("data", { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Fetched ${ownedRepositories.length} repositories, ${languages.length} languages and ${decisionLog.length} recent decisions for ${username}.`);
