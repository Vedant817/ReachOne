import dotenv from "dotenv";

dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_API_URL =
  "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";

export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error("Hugging Face API key not configured.");
  }

  const response = await fetch(HUGGINGFACE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: [text] }),
  });

  if (!response.ok) {
    throw new Error(`Error generating embedding: ${response.statusText}`);
  }

  const data = await response.json();
  return data[0];
};

export const generateReply = async (
  context: string,
  email: string,
): Promise<string> => {
  // This is a placeholder for the RAG implementation.
  // In a real implementation, you would use the context and email to generate a prompt for an LLM.
  return `Based on: "${context}", a good reply to "${email}" would be...`;
};
