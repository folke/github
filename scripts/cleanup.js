module.exports = async ({ github }) => {
  const PER_PAGE = 100;
  let page = 1;
  let hasMoreNotifications = true;

  while (hasMoreNotifications) {
    // Fetch notifications for the current page
    const notifs = await github.request("GET /notifications", {
      per_page: PER_PAGE,
      page: page,
    });

    if (notifs.data.length === 0) {
      hasMoreNotifications = false;
      console.log("No more notifications to process.");
      break;
    }

    // Loop through each notification and its corresponding ID
    for (const notif of notifs.data) {
      const latestCommentUrl = notif.subject.latest_comment_url;

      if (latestCommentUrl) {
        // Fetch the comment details
        const comment = await github.request(`GET ${latestCommentUrl}`);
        const isStaleBot =
          comment.data.user.login === "github-actions[bot]" &&
          /stale/.test(comment.data.body);

        // If the comment was made by stale-bot, delete the notification
        if (isStaleBot) {
          console.log(`Deleting notification: ${notif.url}`);
          await github.request(`DELETE /notifications/threads/${notif.id}`);
        } else {
          console.log(
            `Notification is not from stale-bot ${notif.id} ${latestCommentUrl}`,
          );
        }
      }
    }

    // Move to the next page
    page++;
  }
};
