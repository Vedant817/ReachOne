/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";
import { auth } from "@/auth";
import { getUserById } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUserById(session.user.id);

  if (!user?.apiKeys?.elasticsearchHosts) {
    return NextResponse.json(
      { error: "Configuration not found" },
      { status: 404 },
    );
  }

  console.log("User Elasticsearch config:", user.apiKeys.elasticsearchHosts);

  const elasticsearchClient = new Client({
    node: user.apiKeys.elasticsearchHosts,
  });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  try {
    // Check if the index exists
    const indexExists = await elasticsearchClient.indices.exists({
      index: "emails",
    });

    console.log("Index exists:", indexExists);

    if (!indexExists) {
      // Return empty array if index doesn't exist yet
      console.log("Index doesn't exist, returning empty array");
      return NextResponse.json({ emails: [] });
    }

    const query: any = {
      bool: {
        must: [],
      },
    };

    if (search) {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: ["subject", "from.text"],
        },
      });
    } else {
      query.bool.must.push({ match_all: {} });
    }

    if (category) {
      query.bool.must.push({
        match: {
          "category.keyword": category,
        },
      });
    }

    const response = await elasticsearchClient.search({
      index: "emails",
      body: {
        query: query,
        sort: [{ date: { order: "desc" } }],
      },
    });

    const totalHits = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;
    console.log(`Found ${totalHits} emails in Elasticsearch`);
    const emails = response.hits.hits.map((hit: any) => hit._source);
    console.log(`Returning ${emails.length} emails to frontend`);

    return NextResponse.json({ emails });
  } catch (error) {
    console.error("Error fetching emails:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
