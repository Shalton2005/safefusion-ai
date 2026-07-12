import { createService } from './base.service';
import type { RecommendationResult } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<RecommendationResult>('/recommendations');

export const recommendationService = {
  /** Priority-ordered operator recommendations (`GET /recommendations`). */
  getRecommendations: async (options?: RequestOptions): Promise<RecommendationResult> => {
    const { data } = await base.get<RecommendationResult>('', undefined, options);
    return data;
  },
};
