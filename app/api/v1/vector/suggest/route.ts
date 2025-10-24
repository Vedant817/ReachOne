import { NextResponse } from "next/server";
import { generateEmbedding, generateReply } from "@/lib/llm";
import { searchSimilarVectors } from "@/lib/vector";

const getAgendaById = (id: number): string => {
  return "I am applying for a job position. If the lead is interested, share the meeting booking link: https://cal.com/example";
};

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const embedding = await generateEmbedding(email);
    const similarVectors = await searchSimilarVectors(embedding, 1);

    if (similarVectors.length === 0) {
      return NextResponse.json({ suggestion: "No relevant agenda found." });
    }

    const agendaId = similarVectors[0].id;
    const agenda = getAgendaById(agendaId);

    const suggestion = await generateReply(agenda, email);

    return NextResponse.json({ suggestion });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
