module.exports = async ({ github }) => {
  const PER_PAGE = 100;
  let page = 1;
  let before = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

  do {
    // Fetch notifications for the current page
    const notifs = await github.request("GET /notifications", {
      per_page: PER_PAGE,
      page: page,
      // before: before.toISOString(),
    });

    // Loop through each notification and its corresponding ID
    for (const notif of notifs.data) {
      let done = false;

      // Mark discussions as done
      if (notif.subject.type == "Discussion") {
        done = true;
      }

      // Mark closes isssues / RRs as done
      else if (
        notif.subject.type == "Issue" ||
        notif.subject.type == "PullRequest"
      ) {
        const latestCommentUrl = notif.subject.latest_comment_url;
        // Fetch the issue/PR details
        const details = await github.request(`GET ${notif.subject.url}`);
        // Mark as done if the issue/PR is closed
        if (details.data.state === "closed") done = true;
        // If the issue/PR is open, check if the latest comment is from stale-bot
        else if (latestCommentUrl) {
          // Fetch the comment details
          const comment = await github.request(`GET ${latestCommentUrl}`);
          const isStaleBot =
            comment.data.user.login === "github-actions[bot]" &&
            /stale/.test(comment.data.body);

          // If the comment was made by stale-bot, delete the notification
          if (isStaleBot) {
            done = true;
            console.log(`Deleting notification: ${notif.url}`);
            await github.request(`DELETE /notifications/threads/${notif.id}`);
          } else {
            console.log(
              `Notification is not from stale-bot ${notif.id} ${latestCommentUrl}`,
            );
          }
        }
      }
      if (done) {
        console.log(`Deleting notification: ${notif.url}`);
        await github.request(`DELETE /notifications/threads/${notif.id}`);
      } else {
        console.log(`Skipping notifications ${notif.url}`);
      }
    }

    // Move to the next page
    page++;
  } while (notifs.data.length === PER_PAGE);
};
