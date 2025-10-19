// @ts-check
/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const userRepos = await github.paginate("GET /user/repos", {
    affiliation: "owner",
    visibility: "public",
    per_page: 100,
  });

  const lazyVimRepos = await github.paginate("GET /orgs/{org}/repos", {
    org: "LazyVim",
    per_page: 100,
  });

  const repos = [...userRepos, ...lazyVimRepos];

  const LABELS = [
    {
      name: "stale",
      color: "d6d3d1", // #d6d3d1 (stone-300)
      description: "This issue or PR has been inactive for a while",
    },
    {
      name: "upstream",
      color: "fbbf24", // #fbbf24 (amber-400)
      description:
        "This issue or PR depends on an upstream dependency or library",
    },
    {
      name: "autorelease: pending",
      color: "16a34a", // #16a34a (green-600)
      description: "This PR is pending an automatic release",
    },
    {
      name: "vacation",
      color: "3b82f6", // #3b82f6 (blue-500)
      description: "Maintainer is on vacation, response may be delayed",
    },
    {
      name: "pinned",
      color: "d8b4fe", // #d8b4fe (purple-300)
      description:
        "This issue should stay open and will not be marked as stale",
    },
    {
      name: "notstale",
      color: "16a34a", // #16a34a (green-600)
      description:
        "Marks an issue or pull request to prevent it from being marked as stale",
    },
    {
      name: "wontfix",
      color: "e5e7eb", // #e5e7eb (gray-200)
      description: "This issue will not be fixed or implemented",
    },
    {
      name: "size/xs",
      color: "10b981", // #10b981 (emerald-500)
      description: "Extra small PR (<3 lines changed)",
    },
    {
      name: "size/s",
      color: "84cc16", // #84cc16 (lime-500)
      description: "Small PR (<10 lines changed)",
    },
    {
      name: "size/m",
      color: "eab308", // #eab308 (yellow-500)
      description: "Medium PR (<50 lines changed)",
    },
    {
      name: "size/l",
      color: "f97316", // #f97316 (orange-500)
      description: "Large PR (<100 lines changed)",
    },
    {
      name: "size/xl",
      color: "ef4444", // #ef4444 (red-500)
      description: "Extra large PR (100+ lines changed)",
    },
  ];

  for (const repo of repos) {
    const [owner, name] = repo.full_name.split("/");
    if (
      (!name.includes("nvim") && owner !== "LazyVim") ||
      repo.fork ||
      repo.archived ||
      repo.disabled
    ) {
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
      per_page: 100,
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
          description: label.description,
        });
      } else {
        try {
          await github.rest.issues.createLabel({
            owner,
            repo: name,
            name: label.name,
            color: label.color,
            description: label.description,
          });
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
};
