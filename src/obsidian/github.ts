/**
 * GitHub API client for writing files to the coreds-vault.
 * Uses REST API v3: PUT /repos/{owner}/{repo}/contents/{path}
 */

interface PutFileOptions {
  token: string;
  repo: string;    // "owner/repo"
  branch: string;
  path: string;    // e.g. "09-knowledge/digests/2026-03-03-digest.md"
  content: string; // raw file content (will be base64-encoded)
  message: string; // commit message
}

export async function putFile(opts: PutFileOptions): Promise<void> {
  const { token, repo, branch, path, content, message } = opts;

  const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Fetch existing file SHA (required for updates)
  let sha: string | undefined;
  const getRes = await fetch(url, { headers });
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha: string };
    sha = existing.sha;
  }

  // Base64-encode content
  const encoded = Buffer.from(content, "utf-8").toString("base64");

  const body: Record<string, unknown> = { message, content: encoded, branch };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub API error ${putRes.status}: ${errText}`);
  }
}
