import dotenv from "dotenv";

dotenv.config();

const HUGGINGFACE_API_URL =
  "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Simple hash-based local embedding as fallback
const generateLocalEmbedding = (text: string): number[] => {
  const embedding: number[] = [];
  const dimension = 384; // all-MiniLM-L6-v2 output dimension

  // Create a deterministic embedding based on text content
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate consistent vector from hash
  for (let i = 0; i < dimension; i++) {
    const seed = hash + i;
    const x = Math.sin(seed) * 10000;
    embedding.push(x - Math.floor(x));
  }

  return embedding;
};

export const generateEmbedding = async (
  text: string,
  huggingfaceApiKey?: string,
): Promise<number[]> => {
  const apiKey = huggingfaceApiKey || process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    console.warn(
      "Hugging Face API key not configured. Using local fallback embedding.",
    );
    return generateLocalEmbedding(text);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(HUGGINGFACE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: [text] }),
      });

      if (response.ok) {
        const data = await response.json();
        return data[0];
      }

      // Check if this is a retryable error
      if (
        response.status === 503 ||
        response.status === 429 ||
        response.status === 500
      ) {
        // Retryable error - wait and try again
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `Hugging Face API returned ${response.status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Authentication error (${response.status}): Invalid or expired API key`,
        );
      }

      if (response.status === 410) {
        throw new Error(
          `Model unavailable (${response.status}): The embedding model is temporarily unavailable. Using local fallback.`,
        );
      }

      throw new Error(
        `Hugging Face API error: ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is an authentication or model error, don't retry
      if (
        lastError.message.includes("Authentication") ||
        lastError.message.includes("Model unavailable")
      ) {
        console.warn(`${lastError.message} Using local fallback embedding.`);
        return generateLocalEmbedding(text);
      }

      // For network errors, retry if we haven't exceeded max retries
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `Embedding generation failed: ${lastError.message}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted - use fallback
  console.warn(
    `Failed to generate embedding after ${MAX_RETRIES} attempts. Using local fallback embedding.`,
  );
  return generateLocalEmbedding(text);
};

export const generateReply = async (
  context: string,
  email: string,
  conversationHistory?: string[] | string,
  openrouterApiKey?: string,
  huggingfaceApiKey?: string,
): Promise<string> => {
  const openrouterKey = openrouterApiKey || process.env.OPENROUTER_API_KEY;
  const hfKey = huggingfaceApiKey || process.env.HUGGINGFACE_API_KEY;

  const emailSubject = extractSubject(email);
  const emailContent = extractContent(email);
  const emailSender = extractSender(email);

  const conversationText = conversationHistory
    ? Array.isArray(conversationHistory)
      ? conversationHistory.join("\n\n")
      : conversationHistory
    : "";

  const prompt = createReplyPrompt(
    context,
    emailSubject,
    emailContent,
    emailSender,
    conversationText,
  );

  try {
    if (openrouterKey) {
      return await generateReplyWithOpenRouter(prompt, openrouterKey);
    } else if (hfKey) {
      return await generateReplyWithHuggingFace(prompt, hfKey);
    } else {
      return generateFallbackReply(
        context,
        emailSubject,
        emailContent,
        conversationText,
      );
    }
  } catch (error) {
    console.error("Error generating reply:", error);
    return generateFallbackReply(
      context,
      emailSubject,
      emailContent,
      conversationText,
    );
  }
};

const extractSubject = (email: string): string => {
  const subjectMatch = email.match(/Subject:\s*(.+)/i);
  return subjectMatch ? subjectMatch[1].trim() : "No subject";
};

const extractContent = (email: string): string => {
  const lines = email.split("\n");
  const contentStart = lines.findIndex(
    (line) =>
      line.toLowerCase().includes("content") ||
      line.toLowerCase().includes("body") ||
      line.trim() === "",
  );

  if (contentStart !== -1) {
    return lines
      .slice(contentStart + 1)
      .join("\n")
      .trim();
  }

  return email;
};

const extractSender = (email: string): string => {
  const fromMatch = email.match(/From:\s*(.+)/i);
  return fromMatch ? fromMatch[1].trim() : "Unknown sender";
};

const createReplyPrompt = (
  context: string,
  subject: string,
  content: string,
  sender: string,
  conversationHistory?: string,
): string => {
  return `You are a professional email assistant. Based on the following context and incoming email, generate a helpful, professional reply.

CONTEXT (Your agenda/goals):
${context}

INCOMING EMAIL:
From: ${sender}
Subject: ${subject}
Content: ${content}

Generate a professional reply that:
1. Acknowledges the sender appropriately
2. Addresses their specific points or questions
3. Incorporates your agenda/goals naturally
4. Maintains a professional tone
5. Includes a clear call-to-action if appropriate

${conversationHistory ? `\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\n--- End of Previous Messages ---\n` : ""}

Reply:`;
};

const generateReplyWithOpenRouter = async (
  prompt: string,
  apiKey: string,
): Promise<string> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://reach-one-murex.vercel.app",
            "X-Title": "ReachOne Email Assistant",
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-nano-30b-a3b:free",
            messages: [
              {
                role: "system",
                content:
                  "You are a professional email assistant that generates helpful, contextually appropriate email replies. Keep responses concise but comprehensive.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content.trim();
      }

      // Check if retryable
      if (
        response.status === 503 ||
        response.status === 429 ||
        response.status === 500
      ) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `OpenRouter API returned ${response.status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `OpenRouter API call failed: ${lastError.message}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw (
    lastError ||
    new Error("Failed to generate reply with OpenRouter after all retries")
  );
};

const generateReplyWithHuggingFace = async (
  prompt: string,
  apiKey: string,
): Promise<string> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_length: 500,
              temperature: 0.7,
              do_sample: true,
            },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data)
          ? data[0].generated_text
          : data.generated_text || data[0]?.generated_text || "";
      }

      // Check if retryable
      if (
        response.status === 503 ||
        response.status === 429 ||
        response.status === 500
      ) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `Hugging Face API returned ${response.status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(
        `Hugging Face API error: ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `Hugging Face API call failed: ${lastError.message}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw (
    lastError ||
    new Error("Failed to generate reply with Hugging Face after all retries")
  );
};

const generateFallbackReply = (
  context: string,
  subject: string,
  content: string,
  conversationHistory?: string,
): string => {
  // Simple rule-based fallback when APIs are not available
  const lowerContent = content.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  if (
    lowerContent.includes("interested") ||
    lowerSubject.includes("interested")
  ) {
    return `Thank you for your interest! I'd be happy to discuss this further. ${context.includes("meeting") ? "Would you like to schedule a call?" : "Please let me know how I can help."}`;
  }

  if (lowerContent.includes("meeting") || lowerContent.includes("call")) {
    return `Thank you for reaching out! I'd be happy to schedule a meeting. ${context.includes("cal.com") ? "You can book a time that works for you at: https://cal.com/example" : "Please let me know your availability."}`;
  }

  if (
    lowerContent.includes("not interested") ||
    lowerContent.includes("unsubscribe")
  ) {
    return `Thank you for letting me know. I'll remove you from future communications. Have a great day!`;
  }

  // Generic professional response
  return `Thank you for your email regarding "${subject}". ${context.includes("job") ? "I appreciate your interest and would be happy to discuss this opportunity further." : "I will review your message and get back to you with more information."}${conversationHistory ? `\n\nPrevious messages:\n${conversationHistory}` : ""} Please let me know if you have any questions.`;
};
