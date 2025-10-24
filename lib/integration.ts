import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";

dotenv.config();

const slackToken = process.env.SLACK_TOKEN;
const slackChannel = process.env.SLACK_CHANNEL || "#general";
const webhookUrl = process.env.WEBHOOK_URL;

const web = new WebClient(slackToken);

export const sendSlackNotification = async (message: string) => {
  if (!slackToken) {
    console.error("Slack token not configured.");
    return;
  }

  try {
    await web.chat.postMessage({
      channel: slackChannel,
      text: message,
    });
    console.log("Slack notification sent.");
  } catch (error) {
    console.error("Error sending Slack notification:", error);
  }
};

export const sendWebhookNotification = async (data: any) => {
  if (!webhookUrl) {
    console.error("Webhook URL not configured.");
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
