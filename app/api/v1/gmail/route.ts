import { NextResponse } from "next/server";
import { fetchEmails } from "@/lib/imap";
import { createIndex, indexEmail } from "@/lib/elasticsearch";

export async function GET() {
  try {
    const emails = await fetchEmails();
    const indexName = "emails";

    await createIndex(indexName);

    for (const email of emails) {
      await indexEmail(indexName, email);
    }

    return NextResponse.json({ emails });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
