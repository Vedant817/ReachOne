import { NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config();

const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_HOSTS || "http://localhost:9200",
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  try {
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

    const emails = response.hits.hits.map((hit: any) => hit._source);

    return NextResponse.json({ emails });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
