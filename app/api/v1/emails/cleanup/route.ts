import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/users";
import { createClient } from "@/lib/elasticsearch";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = getUserById(session.user.id);

    if (!user?.apiKeys?.elasticsearchHosts) {
      return NextResponse.json(
        { error: "Elasticsearch configuration not found." },
        { status: 400 },
      );
    }

    const elasticsearchClient = createClient(user.apiKeys.elasticsearchHosts);
    const indexName = "emails";

    // Get all emails
    const response = await elasticsearchClient.search({
      index: indexName,
      body: {
        query: { match_all: {} },
        size: 10000, // Get all emails
        sort: [{ date: { order: "desc" } }],
      },
    });

    const emails = response.hits.hits;
    console.log(`Found ${emails.length} emails in index`);

    // Group by unique identifier
    const emailMap = new Map();
    const duplicates = [];

    for (const hit of emails) {
      const email = hit._source as any;
      const emailId = `${email.messageId || email.subject}_${email.date}_${email.from?.text}`;

      if (emailMap.has(emailId)) {
        duplicates.push(hit._id);
      } else {
        emailMap.set(emailId, hit._id);
      }
    }

    console.log(`Found ${duplicates.length} duplicate emails to remove`);

    // Delete duplicates
    let deletedCount = 0;
    for (const duplicateId of duplicates) {
      try {
        await elasticsearchClient.delete({
          index: indexName,
          id: duplicateId,
        });
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting duplicate ${duplicateId}:`, error);
      }
    }

    console.log(`Successfully deleted ${deletedCount} duplicate emails`);

    return NextResponse.json({
      message: `Cleaned up ${deletedCount} duplicate emails`,
      totalEmails: emails.length,
      uniqueEmails: emails.length - deletedCount,
      duplicatesRemoved: deletedCount
    });
  } catch (error) {
    console.error("Error cleaning up duplicates:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}