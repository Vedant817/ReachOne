interface VectorItem {
  id: number;
  vector: number[];
  text: string;
}

let vectors: VectorItem[] = [];
let nextId = 0;

export const initVectorSpace = async () => {
  vectors = [];
  nextId = 0;
};

export const addVector = async (vector: number[], id: number, text?: string) => {
  vectors.push({
    id: id,
    vector: vector,
    text: text || ""
  });
};

export const searchSimilarVectors = async (vector: number[], k: number) => {
  if (vectors.length === 0) {
    return [];
  }

  // Calculate cosine similarity for all vectors
  const similarities = vectors.map(item => {
    const similarity = cosineSimilarity(vector, item.vector);
    return {
      id: item.id,
      distance: 1 - similarity // Convert similarity to distance
    };
  });

  // Sort by similarity (descending) and return top k
  return similarities
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
};

export const getAgendaById = (id: number): string | undefined => {
  const item = vectors.find(v => v.id === id);
  return item?.text;
};

export const getAllAgendas = (): Array<{ id: number; text: string }> => {
  return vectors.map(v => ({ id: v.id, text: v.text }));
};

// Helper function to calculate cosine similarity
const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};
