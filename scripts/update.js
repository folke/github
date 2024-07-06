// @ts-check
/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
export default async ({ github, context }) => {
  const repo = `${context.repo.owner}/${context.repo.repo}`;

  // Enable repository settings
  await github.rest.repos.update({
    ...context.repo,
    allow_update_branch: true,
    has_discussions: true,
    allow_squash_merge: true,
    allow_rebase_merge: true,
    allow_merge_commit: false,
    has_wiki: true,
    squash_merge_commit_title: "PR_TITLE",
    squash_merge_commit_message: "PR_BODY",
  });

  // Update branch protection
  await github.request(`PUT /repos/${repo}/branches/main/protection`, {
    headers: {
      accept: "application/vnd.github.v3+json",
    },
    allow_deletions: false,
    allow_force_pushes: false,
    allow_fork_syncing: false,
    block_creations: false,
    enforce_admins: false,
    lock_branch: false,
    required_conversation_resolution: false,
    required_linear_history: false,
    required_signatures: false,
    required_status_checks: null,
    required_pull_request_reviews: null,
    restrictions: null,
  });
};
