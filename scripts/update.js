// @ts-check
/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const repos = await github.paginate("GET /user/repos", {
    affiliation: "owner",
    visibility: "public",
    per_page: 100,
  });

  const LABELS = [
    { name: "stale", color: "F9D0C4" },
    { name: "upstream", color: "FBCA04" },
    { name: "autorelease: pending", color: "0e8a16" },
    { name: "vacation", color: "1D76DB" },
    { name: "pinned", color: "D4C5F9" },
  ];

  for (const repo of repos) {
    const [owner, name] = repo.full_name.split("/");
    if (!name.includes("nvim") || repo.fork || repo.archived || repo.disabled) {
      continue;
    }

    console.log(`Updating ${repo.full_name}...`);
    // Enable repository settings
    await github.rest.repos.update({
      repo: name,
      owner: owner,
      allow_update_branch: true,
      has_discussions: true,
      allow_squash_merge: true,
      allow_rebase_merge: true,
      allow_merge_commit: false,
      has_wiki: true,
      squash_merge_commit_title: "PR_TITLE",
      squash_merge_commit_message: "PR_BODY",
    });

    const branch = repo.default_branch;
    // Update branch protection
    await github.request(
      `PUT /repos/${owner}/${name}/branches/${branch}/protection`,
      {
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
      },
    );

    // Labels
    const labels = await github.rest.issues.listLabelsForRepo({
      owner,
      repo: name,
    });
    for (const label of LABELS) {
      const existing = labels.data.find(
        (l) => l.name.toLowerCase() === label.name.toLowerCase(),
      );
      if (
        existing?.color === label.color &&
        existing?.description === label.description
      ) {
        continue;
      }
      if (existing) {
        await github.rest.issues.updateLabel({
          owner,
          repo: name,
          name: label.name,
          new_name: label.name,
          color: label.color,
        });
      } else {
        try {
          await github.rest.issues.createLabel({
            owner,
            repo: name,
            name: label.name,
            color: label.color,
          });
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
};
