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
    const currentId = nextId++;
    await addVector(embedding, currentId, text);

    return NextResponse.json({ 
      message: "Agenda stored successfully",
      id: currentId,
      text: text
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
