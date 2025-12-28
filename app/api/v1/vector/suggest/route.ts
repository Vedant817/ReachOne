import { NextResponse } from "next/server";
import { generateEmbedding, generateReply } from "@/lib/llm";
import { searchSimilarVectors, getAgendaById } from "@/lib/vector";
import { auth } from "@/auth";
import { getUserById } from "@/lib/users";

export const runtime = "nodejs";

// Similarity threshold (0-1): agendas below this won't be used
// 0.5 means 50% similarity required (cosine similarity >= 0.5)
// In distance terms (1 - similarity), this means distance <= 0.5
const SIMILARITY_THRESHOLD = 0.5; // 50% match required

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUserById(session.user.id);

  if (!user?.apiKeys?.openrouterApiKey) {
    return NextResponse.json(
      {
        error: "OpenRouter API key not configured. Please complete onboarding.",
      },
      { status: 400 },
    );
  }

  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    let embedding: number[];
    try {
      embedding = await generateEmbedding(
        email,
        user.apiKeys.huggingfaceApiKey,
      );
    } catch (embeddingError) {
      console.warn(
        "Embedding generation failed, using fallback:",
        embeddingError,
      );
      // Fallback will be handled in generateEmbedding
      embedding = await generateEmbedding(
        email,
        user.apiKeys.huggingfaceApiKey,
      );
    }

    const similarVectors = await searchSimilarVectors(embedding, 10); // Get top 10 to filter

    if (similarVectors.length === 0) {
      return NextResponse.json({
        suggestion:
          "📋 No matching agenda found for this email.\n\nPlease store relevant agenda content first to get personalized suggestions. Your stored agendas will be used to match incoming emails.",
        context: "No context available",
        similarity: null,
        agendas: [],
        hasMatchingAgenda: false,
      });
    }

    // Filter agendas by similarity threshold
    // Since distance = 1 - similarity, we filter where distance <= SIMILARITY_THRESHOLD
    // Which means similarity >= (1 - SIMILARITY_THRESHOLD)
    const relevantAgendas = [];
    for (const vector of similarVectors) {
      // Check if similarity is above threshold
      const similarity = 1 - vector.distance; // Convert distance back to similarity
      if (similarity >= 1 - SIMILARITY_THRESHOLD) {
        const agenda = getAgendaById(vector.id);
        if (agenda) {
          relevantAgendas.push({
            id: vector.id,
            content: agenda,
            similarity: similarity,
            distance: vector.distance,
          });
        }
      }
    }

    console.log(
      `Found ${relevantAgendas.length} agendas matching threshold ${1 - SIMILARITY_THRESHOLD}`,
    );

    // If no agendas meet the threshold, inform the user
    if (relevantAgendas.length === 0) {
      const bestMatch = similarVectors[0];
      const bestSimilarity = 1 - bestMatch.distance;

      return NextResponse.json({
        suggestion: `📋 No relevant agenda found for this email.\n\nThe closest match had only ${(bestSimilarity * 100).toFixed(1)}% similarity, but we require at least ${(1 - SIMILARITY_THRESHOLD) * 100}% to ensure quality suggestions.\n\nPlease store agenda content that better matches your typical emails.`,
        context: "No matching context",
        similarity: bestSimilarity,
        agendas: [],
        hasMatchingAgenda: false,
        bestMatchSimilarity: bestSimilarity,
      });
    }

    // Use top relevant agendas for context
    const topAgendas = relevantAgendas
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 2); // Use top 2 agendas

    const combinedContext = topAgendas
      .map(
        (agenda) =>
          `[Agenda ${((agenda.similarity || 0) * 100).toFixed(1)}% match]: ${agenda.content}`,
      )
      .join("\n\n");

    console.log(
      `Using ${topAgendas.length} relevant agendas with similarity scores: ${topAgendas.map((a) => `${((a.similarity || 0) * 100).toFixed(1)}%`).join(", ")}`,
    );

    // Generate reply using combined context from relevant agendas
    let suggestion: string;
    try {
      suggestion = await generateReply(
        combinedContext,
        email,
        undefined,
        user.apiKeys.openrouterApiKey,
        user.apiKeys.huggingfaceApiKey,
      );
    } catch (replyError) {
      console.warn("Reply generation failed, using fallback:", replyError);
      // generateReply has a fallback mechanism, but if it still fails, provide a basic response
      suggestion =
        "I have reviewed your email and will respond shortly with a detailed reply. Thank you for reaching out.";
    }

    return NextResponse.json({
      suggestion,
      context: combinedContext,
      conversationContext: null,
      similarity: topAgendas[0]?.similarity,
      agendas: topAgendas,
      agendaCount: topAgendas.length,
      hasMatchingAgenda: true,
    });
  } catch (error) {
    console.error("Suggest reply error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to generate reply. Please try again later.";

    return NextResponse.json(
      {
        error: errorMessage,
        suggestion: null,
        hasMatchingAgenda: false,
      },
      { status: 500 },
    );
  }
}
