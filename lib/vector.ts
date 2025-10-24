import { HierarchicalNSW } from "hnswlib-node";

const MAX_ELEMENTS = 1000;
const VECTOR_DIMENSION = 4; // This should be the dimension of your vectors

let index: HierarchicalNSW | null = null;

export const initVectorSpace = async () => {
  if (!index) {
    index = new HierarchicalNSW("l2", VECTOR_DIMENSION);
    index.initIndex(MAX_ELEMENTS);
  }
};

export const addVector = async (vector: number[], id: number) => {
  if (!index) {
    await initVectorSpace();
  }
  index!.addPoint(vector, id);
};

export const searchSimilarVectors = async (vector: number[], k: number) => {
  if (!index) {
    return [];
  }
  const result = index.searchKnn(vector, k);
  return result.neighbors.map((neighbor, i) => ({
    id: neighbor,
    distance: result.distances[i],
  }));
};
