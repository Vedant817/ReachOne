/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebClient } from "@slack/web-api";

export const sendSlackNotification = async (
  message: string,
  slackToken: string,
  slackChannel: string = "#general",
) => {
  if (!slackToken) {
    console.error("Slack token not provided.");
    return;
  }

  try {
    const web = new WebClient(slackToken);
    await web.chat.postMessage({
      channel: slackChannel,
      text: message,
    });
    console.log("Slack notification sent.");
  } catch (error) {
    console.error("Error sending Slack notification:", error);
  }
};

export const sendWebhookNotification = async (
  data: any,
  webhookUrl: string,
) => {
  if (!webhookUrl) {
    console.error("Webhook URL not provided.");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log("Webhook notification sent.");
    } else {
      console.error("Error sending webhook notification:", response.statusText);
    }
  } catch (error) {
    console.error("Error sending webhook notification:", error);
  }
};
