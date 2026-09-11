// One bounded snapshot powers the top status and each project's evidence trail.
export function normalizeCommit(commit, repo) {
  if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error(`Invalid commit SHA in ${repo}`);
  const date = commit.commit?.committer?.date || commit.commit?.author?.date;
  if (!Number.isFinite(Date.parse(date))) throw new Error(`Invalid commit date in ${repo}`);
  return {
    sha: commit.sha,
    date,
    title: String(commit.commit.message).split(/\r?\n/)[0].replace(/[\u0000-\u001f\u007f]/g, " "),
    url: `https://github.com/${repo}/commit/${commit.sha}`,
    author: commit.author?.login || commit.commit.author?.name || "Repository contributor",
  };
}

export async function collectProjectActivity(request, project, now) {
  const until = now.toISOString();
  const since = new Date(now.getTime() - 7 * 86400000).toISOString();
  const base = `/repos/${project.repo}/commits`;
  const { data: latest } = await request(`${base}?per_page=3`, { allowEmptyRepository: true });
  const seen = new Set();
  for (let page = 1; ; page += 1) {
    const query = new URLSearchParams({ since, until, per_page: "100", page: String(page) });
    const { data } = await request(`${base}?${query}`, { allowEmptyRepository: true });
    for (const commit of data) {
      const time = Date.parse(commit.commit?.committer?.date || commit.commit?.author?.date);
      if (time >= Date.parse(since) && time <= now.getTime()) seen.add(commit.sha);
    }
    if (data.length < 100) break;
  }
  return {
    id: project.id,
    repo: project.repo,
    commitsLast7Days: seen.size,
    recent: latest.map((commit) => normalizeCommit(commit, project.repo)),
  };
}

export function statusFromActivity(activity, projects) {
  const latest = activity.projects.flatMap((project) => project.recent.map((commit) => ({ ...commit, id: project.id })))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  const count = activity.projects.reduce((sum, project) => sum + project.commitsLast7Days, 0);
  const name = projects.find((project) => project.id === latest?.id)?.name;
  return {
    text: `$ open to software engineering internships · ${name ? `latest work: ${name}` : "building in public"}`,
    url: latest?.url || `https://github.com/${activity.username}?tab=repositories`,
    scope: `Latest default-branch activity across ${projects.length} selected repositories; all authors. ${count} ${count === 1 ? "commit" : "commits"} in the last 7 days through ${activity.generatedAt}.`,
  };
}
