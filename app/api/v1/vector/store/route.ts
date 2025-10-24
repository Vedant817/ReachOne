import { NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/llm";
import { addVector, initVectorSpace } from "@/lib/vector";

let nextId = 0;

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  try {
    await initVectorSpace();
    const embedding = await generateEmbedding(text);
    await addVector(embedding, nextId++);

    return NextResponse.json({ message: "Agenda stored successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
