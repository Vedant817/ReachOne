import Imap from "node-imap";
import { simpleParser, ParsedMail } from "mailparser";
import dotenv from "dotenv";
import { createIndex, indexEmail } from "./elasticsearch";
import { categorizeEmail } from "./ai";
import { sendSlackNotification, sendWebhookNotification } from "./integration";

dotenv.config();

const imapConfig: Imap.Config = {
  user: process.env.IMAP_USER || "",
  password: process.env.IMAP_PASSWORD || "",
  host: process.env.IMAP_HOST || "",
  port: 993,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false,
  },
};

export const startIdle = () => {
  const imap = new Imap(imapConfig);

  const openInbox = (cb: (err: Error, box: Imap.Box) => void) => {
    imap.openBox("INBOX", false, cb);
  };

  imap.once("ready", () => {
    openInbox(async (err, box) => {
      if (err) throw err;
      console.log("Inbox opened. Listening for new emails...");

      imap.on("mail", (numNewMsgs: number) => {
        console.log(`New email received! You have ${numNewMsgs} new messages.`);
        // Fetch new emails
        const f = imap.seq.fetch(box.messages.total + ":*", { bodies: "" });
        f.on("message", (msg, seqno) => {
          console.log("Message #%d", seqno);
          const prefix = "(#" + seqno + ") ";
          msg.on("body", (stream, info) => {
            simpleParser(stream, async (err, mail) => {
              if (err) {
                console.error(prefix + "Error parsing email:", err);
              } else {
                console.log(prefix + "Parsed email:", mail.subject);
                const category = categorizeEmail(mail);
                const emailWithCategory = { ...mail, category };
                const indexName = "emails";
                await createIndex(indexName);
                await indexEmail(indexName, emailWithCategory);
                console.log(
                  prefix + "Email indexed successfully with category:",
                  category,
                );

                if (category === "Interested") {
                  await sendSlackNotification(
                    `New interested email from: ${mail.from?.text}`,
                  );
                  await sendWebhookNotification(emailWithCategory);
                }
              }
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
    console.log("IMAP error:", err);
  });

  imap.once("end", () => {
    console.log("Connection ended");
  });

  imap.connect();
};

export const fetchEmails = (): Promise<ParsedMail[]> => {
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);
    const emails: ParsedMail[] = [];

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
            msg.on("body", (stream, info) => {
              simpleParser(stream, async (err, mail) => {
                if (err) {
                  console.error(prefix + "Error parsing email:", err);
                } else {
                  console.log(prefix + "Parsed email:", mail.subject);
                  const category = categorizeEmail(mail);
                  const emailWithCategory = { ...mail, category };
                  emails.push(emailWithCategory as ParsedMail);

                  if (category === "Interested") {
                    await sendSlackNotification(
                      `New interested email from: ${mail.from?.text}`,
                    );
                    await sendWebhookNotification(emailWithCategory);
                  }
                }
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
      console.log("IMAP error:", err);
      reject(err);
    });

    imap.once("end", () => {
      console.log("Connection ended");
    });

    imap.connect();
  });
};
