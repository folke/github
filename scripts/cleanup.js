module.exports = async ({ github }) => {
  const PER_PAGE = 100;
  let page = 1;
  let before = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  let haveMore = true;

  while (haveMore) {
    // Fetch notifications for the current page
    const notifs = await github.request("GET /notifications", {
      per_page: PER_PAGE,
      page: page,
      all: true,
      // before: before.toISOString(),
    });

    haveMore = notifs.data.length === PER_PAGE;

    // Loop through each notification and its corresponding ID
    for (const notif of notifs.data) {
      let done = false;

      if (
        notif.subject.type == "Discussion" ||
        notif.subject.type == "CheckSuite"
      ) {
        // Mark discussions as done
        done = true;
      } else if (
        // Mark closes isssues / RRs as done
        notif.subject.type == "Issue" ||
        notif.subject.type == "PullRequest"
      ) {
        const latestCommentUrl = notif.subject.latest_comment_url;
        const details = await github.request(`GET ${notif.subject.url}`);
        // Mark as done if the issue/PR is closed
        if (details.data.state === "closed") done = true;
        // If the issue/PR is open, check if the latest comment is from stale-bot
        else if (latestCommentUrl) {
          // Fetch the comment details
          const comment = await github.request(`GET ${latestCommentUrl}`);
          done =
            comment.data.user.login === "github-actions[bot]" &&
            /stale/.test(comment.data.body);
        }
      }
      // remove api. and repos/ from the url
      const url = (notif.subject.url ?? notif.url)
        .replace("api.", "")
        .replace("repos/", "");
      if (done) {
        console.log(`❌ ${notif.subject.title}\n  - ${url}`);
        await github.request(`DELETE /notifications/threads/${notif.id}`);
      } else {
        console.log(`✅ ${notif.subject.title}\n  - ${url}`);
      }
    }

    // Move to the next page
    page++;
  }
};
