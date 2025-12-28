import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/users";
import { fetchEmails } from "@/lib/imap";
import { createClient } from "@/lib/elasticsearch";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getUserById(session.user.id);

    if (!user?.apiKeys?.imapUser || !user?.apiKeys?.imapPassword || !user?.apiKeys?.imapHost) {
      return NextResponse.json(
        { error: "Email configuration not found. Please complete onboarding." },
        { status: 400 },
      );
    }

    if (!user?.apiKeys?.elasticsearchHosts) {
      return NextResponse.json(
        { error: "Elasticsearch configuration not found. Please complete onboarding." },
        { status: 400 },
      );
    }

    console.log("User IMAP config:", {
      user: user.apiKeys.imapUser,
      host: user.apiKeys.imapHost,
      elasticsearchHosts: user.apiKeys.elasticsearchHosts,
    });

    const elasticsearchClient = createClient(user.apiKeys.elasticsearchHosts);

    console.log("Fetching emails from IMAP...");
    const emails = await fetchEmails(
      user.apiKeys.imapUser,
      user.apiKeys.imapPassword,
      user.apiKeys.imapHost,
      user.apiKeys.elasticsearchHosts,
      user.apiKeys.slackToken,
      user.apiKeys.slackChannel,
      user.apiKeys.webhookUrl,
    );

    console.log(`Fetched ${emails.length} emails from IMAP`);

    const indexName = "emails";

    // Ensure index exists
    try {
      const indexExists = await elasticsearchClient.indices.exists({
        index: indexName,
      });
      if (!indexExists) {
        await elasticsearchClient.indices.create({ index: indexName });
        console.log(`Created index: ${indexName}`);
      }
    } catch (error) {
      console.error("Error creating index:", error);
    }

    let indexedCount = 0;
    let skippedCount = 0;

    for (const email of emails) {
      try {
        // Create a unique identifier for the email to prevent duplicates
        const emailId = `${email.messageId || email.subject}_${email.date}_${email.from?.text}`;

        // Check if email already exists
        const existingEmail = await elasticsearchClient.search({
          index: indexName,
          body: {
            query: {
              bool: {
                must: [
                  { term: { "messageId.keyword": email.messageId || emailId } },
                  { term: { "from.text.keyword": email.from?.text } },
                  { term: { "date.keyword": email.date } }
                ]
              }
            }
          }
        });

        const totalHits = typeof existingEmail.hits.total === 'number'
          ? existingEmail.hits.total
          : existingEmail.hits.total?.value || 0;

        if (totalHits > 0) {
          console.log(`Email already exists, skipping: ${email.subject}`);
          skippedCount++;
          continue;
        }

        // Index the email with the unique ID
        await elasticsearchClient.index({
          index: indexName,
          id: emailId, // Use the unique ID as document ID
          body: {
            ...email,
            uniqueId: emailId
          },
        });
        indexedCount++;
      } catch (error) {
        console.error("Error indexing email:", error);
      }
    }

    console.log(`Successfully indexed ${indexedCount} emails to Elasticsearch`);
    console.log(`Skipped ${skippedCount} duplicate emails`);

    return NextResponse.json({
      message: `Fetched ${emails.length} emails, indexed ${indexedCount}, skipped ${skippedCount} duplicates`,
      emails: emails.length,
      indexed: indexedCount,
      skipped: skippedCount
    });
  } catch (error) {
    console.error("Error fetching emails:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
