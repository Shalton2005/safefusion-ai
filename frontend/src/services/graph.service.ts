import { createService } from './base.service';
import type { KnowledgeGraphVisualization } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<KnowledgeGraphVisualization>('/graph');

export interface GetVisualizationParams {
  /** Maximum number of nodes to return. Backend default: 1000. */
  node_limit?: number;
  /** Maximum number of relationships to return. Backend default: 5000. */
  relationship_limit?: number;
}

export const graphService = {
  ...base,

  /**
   * Full knowledge graph — nodes, relationships, and summary metadata —
   * shaped for frontend graph-visualization libraries.
   * `GET /graph/visualization`
   */
  getVisualization: (params?: GetVisualizationParams, options?: RequestOptions) =>
    base.get<KnowledgeGraphVisualization>('visualization', params, options),
};
