/**
 * useKnowledgeGraph
 *
 * Fetches `GET /graph/visualization` (nodes, relationships, and
 * metadata in one payload) exactly once per mount/limit-change.
 * Follows the same shape as useRecentAlerts / useRecentRiskScores so
 * KnowledgeGraphPage doesn't need bespoke data-fetching logic.
 *
 * @example
 * const { nodes, relationships, metadata, loading, error, refresh } = useKnowledgeGraph();
 */

import { useEffect, useState } from 'react';
import { graphService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { KnowledgeGraphMetadata, KnowledgeGraphNode, KnowledgeGraphRelationship } from '@/types';

export interface UseKnowledgeGraphOptions {
  /** Maximum number of nodes to fetch. Backend default: 1000. */
  nodeLimit?: number;
  /** Maximum number of relationships to fetch. Backend default: 5000. */
  relationshipLimit?: number;
}

export interface UseKnowledgeGraphResult {
  nodes: KnowledgeGraphNode[];
  relationships: KnowledgeGraphRelationship[];
  metadata: KnowledgeGraphMetadata | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useKnowledgeGraph({
  nodeLimit,
  relationshipLimit,
}: UseKnowledgeGraphOptions = {}): UseKnowledgeGraphResult {
  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([]);
  const [relationships, setRelationships] = useState<KnowledgeGraphRelationship[]>([]);
  const [metadata, setMetadata] = useState<KnowledgeGraphMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const { controller, signal } = createRequestController();

    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await graphService.getVisualization(
          { node_limit: nodeLimit, relationship_limit: relationshipLimit },
          { signal },
        );
        setNodes(data.nodes);
        setRelationships(data.relationships);
        setMetadata(data.metadata);
      } catch (err) {
        const apiError = ApiError.from(err);
        if (!apiError.isCancelledError) {
          setError(apiError.toUserMessage());
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchGraph();
    return () => controller.abort();
  }, [nodeLimit, relationshipLimit, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  return { nodes, relationships, metadata, loading, error, refresh };
}
