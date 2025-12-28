import Imap from "node-imap";
import { simpleParser, ParsedMail } from "mailparser";
import { Client } from "@elastic/elasticsearch";
import { categorizeEmail } from "./ai";
import { sendSlackNotification, sendWebhookNotification } from "./integration";

export const startIdle = (
  imapUser: string,
  imapPassword: string,
  imapHost: string,
  elasticsearchHosts: string,
  slackToken?: string,
  slackChannel?: string,
  webhookUrl?: string,
): Promise<void> => {
  const imapConfig: Imap.Config = {
    user: imapUser,
    password: imapPassword,
    host: imapHost,
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
    },
  };

  const imap = new Imap(imapConfig);
  const elasticsearchClient = new Client({ node: elasticsearchHosts });

  return new Promise((resolve, reject) => {
    const openInbox = (cb: (err: Error, box: Imap.Box) => void) => {
      imap.openBox("INBOX", false, cb);
    };

    imap.once("ready", () => {
      openInbox(async (err, box) => {
        if (err) {
          reject(err);
          return;
        }
        console.log("Inbox opened. Listening for new emails...");

        imap.on("mail", (numNewMsgs: number) => {
          console.log(`New email received! You have ${numNewMsgs} new messages.`);
          const f = imap.seq.fetch(box.messages.total + ":*", { bodies: "" });
          f.on("message", (msg, seqno) => {
            console.log("Message #%d", seqno);
            const prefix = "(#" + seqno + ") ";
            msg.on("body", (stream) => {
              const buffer: Buffer[] = [];
              stream.on("data", (chunk) => {
                buffer.push(chunk);
              });
              stream.on("end", async () => {
                const fullBuffer = Buffer.concat(buffer);
                simpleParser(fullBuffer, async (err, mail) => {
                  if (err) {
                    console.error(prefix + "Error parsing email:", err);
                  } else {
                    console.log(prefix + "Parsed email:", mail.subject);
                    const category = categorizeEmail(mail);
                    const emailWithCategory = { ...mail, category };
                    const indexName = "emails";

                    const indexExists = await elasticsearchClient.indices.exists({
                      index: indexName,
                    });
                    if (!indexExists) {
                      await elasticsearchClient.indices.create({ index: indexName });
                    }

                    await elasticsearchClient.index({
                      index: indexName,
                      body: emailWithCategory,
                    });
                    console.log(
                      prefix + "Email indexed successfully with category:",
                      category,
                    );

                    if (category === "Interested") {
                      if (slackToken) {
                        await sendSlackNotification(
                          `New interested email from: ${mail.from?.text}`,
                          slackToken,
                          slackChannel || "#general",
                        );
                      }
                      if (webhookUrl) {
                        await sendWebhookNotification(emailWithCategory, webhookUrl);
                      }
                    }
                  }
                });
              });
            });
            msg.once("end", () => {
              console.log(prefix + "Finished");
            });
          });
          f.once("error", (err) => {
            console.log("Fetch error: " + err);
          });
          f.once("end", () => {
            console.log("Done fetching all messages!");
          });
        });
      });
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.once("end", () => {
      console.log("Connection ended");
      resolve();
    });

    imap.connect();
  });
};

export const fetchEmails = (
  imapUser: string,
  imapPassword: string,
  imapHost: string,
  elasticsearchHosts: string,
  slackToken?: string,
  slackChannel?: string,
  webhookUrl?: string,
): Promise<ParsedMail[]> => {
  const imapConfig: Imap.Config = {
    user: imapUser,
    password: imapPassword,
    host: imapHost,
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
    },
  };

  const imap = new Imap(imapConfig);
  const emails: ParsedMail[] = [];
  const elasticsearchClient = new Client({ node: elasticsearchHosts });

  return new Promise((resolve, reject) => {
    const openInbox = (cb: (err: Error, box: Imap.Box) => void) => {
      imap.openBox("INBOX", false, cb);
    };

    imap.once("ready", () => {
      openInbox(async (err, box) => {
        if (err) {
          return reject(err);
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const searchCriteria = ["ALL", ["SINCE", thirtyDaysAgo.toISOString()]];

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            return reject(err);
          }

          if (results.length === 0) {
            console.log("No new emails in the last 30 days.");
            imap.end();
            return resolve([]);
          }

          const f = imap.fetch(results, { bodies: "" });

          f.on("message", (msg, seqno) => {
            console.log("Message #%d", seqno);
            const prefix = "(#" + seqno + ") ";
            msg.on("body", (stream) => {
              const buffer: Buffer[] = [];
              stream.on("data", (chunk) => {
                buffer.push(chunk);
              });
              stream.on("end", async () => {
                const fullBuffer = Buffer.concat(buffer);
                simpleParser(fullBuffer, async (err, mail) => {
                  if (err) {
                    console.error(prefix + "Error parsing email:", err);
                  } else {
                    console.log(prefix + "Parsed email:", mail.subject);
                    const category = categorizeEmail(mail);
                    const emailWithCategory = { ...mail, category };
                    emails.push(emailWithCategory as ParsedMail);

                    if (category === "Interested") {
                      if (slackToken) {
                        await sendSlackNotification(
                          `New interested email from: ${mail.from?.text}`,
                          slackToken,
                          slackChannel || "#general",
                        );
                      }
                      if (webhookUrl) {
                        await sendWebhookNotification(emailWithCategory, webhookUrl);
                      }
                    }
                  }
                });
              });
            });
            msg.once("end", () => {
              console.log(prefix + "Finished");
            });
          });

          f.once("error", (err) => {
            console.log("Fetch error: " + err);
            reject(err);
          });

          f.once("end", () => {
            console.log("Done fetching all messages!");
            imap.end();
            resolve(emails);
          });
        });
      });
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.once("end", () => {
      console.log("Connection ended");
    });

    imap.connect();
  });
};
