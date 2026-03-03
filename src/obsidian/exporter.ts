/**
 * Obsidian vault exporter.
 * Takes a DigestData, formats it as Obsidian Markdown, and pushes it to the
 * vault GitHub repo via the REST API.
 */

import { DigestData } from "../digest/builder";
import { formatDigestObsidian, digestFilename } from "./formatter";
import { putFile } from "./github";
import { config } from "../config";

export interface ExportResult {
  /** Path of the created file inside the repo */
  path: string;
  /** GitHub URL to the file */
  url: string;
}

export async function exportDigestToVault(data: DigestData): Promise<ExportResult> {
  if (!config.githubToken) {
    throw new Error("GITHUB_TOKEN not configured. Add it to .env");
  }
  if (!config.githubRepo) {
    throw new Error("GITHUB_REPO not configured. Add it to .env (e.g. owner/repo)");
  }

  const content = formatDigestObsidian(data);
  const filename = digestFilename(data.periodStart);
  const path = `${config.obsidianDigestsPath}/${filename}`;
  const date = data.periodStart.toISOString().slice(0, 10);
  const commitMessage = `feat(digest): add Telegram digest ${date} (${data.messageIds.length} msg)`;

  await putFile({
    token: config.githubToken,
    repo: config.githubRepo,
    branch: config.githubBranch,
    path,
    content,
    message: commitMessage,
  });

  const url = `https://github.com/${config.githubRepo}/blob/${config.githubBranch}/${path}`;
  return { path, url };
}
