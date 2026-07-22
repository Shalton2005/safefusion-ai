/**
 * AISupervisorPage
 *
 * Full AI Supervisor dashboard: overall status card, per-category
 * confidence gauges, data pipeline diagram, agent activity, agent
 * workflow graph, decision timeline, and the explainable-AI panel for
 * the selected decision.
 */

import { useState } from 'react';
import { PageHeader, Card, CardHeader, CardContent, Alert, Button, Collapsible } from '@/components/ui';
import { RotateCw } from 'lucide-react';
import { AIRecommendationCardGrid } from '@/components/recommendations';
import { useCompoundRiskEngine } from '@/features/risk/hooks/useCompoundRiskEngine';
import { useEmergencyResponse } from '@/features/emergency/hooks/useEmergencyResponse';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import { useComplianceStatus } from '@/features/compliance/hooks/useComplianceStatus';
import { useAISupervisor } from '../hooks/useAISupervisor';
import { useAgentStatusBoard } from '../hooks/useAgentStatusBoard';
import { useAIExplain } from '../hooks/useAIExplain';
import { useAIRecommend } from '../hooks/useAIRecommend';
import { AISupervisorCard } from '../components/AISupervisorCard';
import { AgentActivityList } from '../components/AgentActivityList';
import { AIAgentStatusBoard } from '../components/AIAgentStatusBoard';
import { AIReasoningPanel } from '../components/AIReasoningPanel';
import { WorkflowGraph } from '../components/WorkflowGraph';
import { PipelineWorkflow } from '../components/PipelineWorkflow';
import { ConfidenceOverview } from '../components/ConfidenceOverview';
import { DecisionTimeline } from '../components/DecisionTimeline';
import { ExplainableAIPanel } from '../components/ExplainableAIPanel';
import { aiSupervisorService } from '../services/aiSupervisor.service';
import type { AIDecision } from '../types';

export function AISupervisorPage() {
  // Mounted once here and shared with both useAISupervisor and
  // useAgentStatusBoard below, so each engine is polled by exactly one
  // instance instead of one per consumer.
  const compoundRisk = useCompoundRiskEngine();
  const emergencyResponse = useEmergencyResponse();
  const recommendation = useRecommendations();
  const compliance = useComplianceStatus();

  const supervisor = useAISupervisor({ compoundRisk, emergencyResponse, recommendation, compliance });
  const { snapshot, loading, error, refresh } = supervisor;
  const agentStatusBoard = useAgentStatusBoard({ compoundRisk, emergencyResponse, recommendation, compliance, supervisor });
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null);
  const aiExplain = useAIExplain(selectedDecision?.id ?? null);
  const aiRecommend = useAIRecommend();

  const agentErrors = snapshot.agents.filter((agent) => agent.error);

  return (
    <div className="page-container">
      <PageHeader
        title="AI Supervisor"
        description="Live synthesis of every safety engine — risk, emergency response, recommendations, and compliance."
        border={false}
        className="px-0 pt-0"
      />

      {agentErrors.length > 0 && (
        <Alert
          variant="danger"
          title="Some agents are offline"
          actions={
            <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
              Retry
            </Button>
          }
        >
          {agentErrors.map((agent) => agent.label).join(', ')} could not be reached.
        </Alert>
      )}

      <AISupervisorCard snapshot={snapshot} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="flex flex-col lg:col-span-1 max-h-[800px]">
          <CardHeader title="What did the AI decide?" description="Chronological log of AI judgements and executed actions" />
          <CardContent className="flex-1 overflow-hidden">
            <DecisionTimeline
              decisions={snapshot.decisions}
              loading={loading && snapshot.decisions.length === 0}
              error={snapshot.decisions.length === 0 ? error : null}
              selectedId={selectedDecision?.id}
              onSelect={setSelectedDecision}
              onRetry={refresh}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="flex-1 flex flex-col">
            <CardHeader title="Why? & What evidence supports it?" description="Full breakdown of why the AI Supervisor made this call" />
            <CardContent className="flex-1 overflow-hidden">
              <ExplainableAIPanel
                data={selectedDecision ? aiSupervisorService.toExplainableAIData(selectedDecision) : null}
              />
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader
              title="What actions were taken?"
              description="AI-surfaced recommendations via POST /ai/recommend"
              action={
                <Button size="sm" variant="outline" onClick={aiRecommend.refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                  Refresh
                </Button>
              }
            />
            <CardContent className="flex-1">
              <AIRecommendationCardGrid
                recommendations={aiRecommend.recommendations}
                loading={aiRecommend.loading}
                error={aiRecommend.error}
                className="xl:grid-cols-2"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Collapsible title="Advanced Diagnostics" description="Technical details, raw AI reasoning, and data pipelines" defaultOpen={false}>
          <div className="flex flex-col gap-4 mt-2">
            <Card>
              <CardHeader
                title="Agent Status"
                description="Current status, execution time, confidence, and last run for every backend agent"
              />
              <CardContent>
                <AIAgentStatusBoard agents={agentStatusBoard.agents} loading={agentStatusBoard.loading} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader title="Agent Activity" description="Live status of every supervised engine" />
                <CardContent>
                  <AgentActivityList agents={snapshot.agents} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Confidence" description="Detection, recommendation, prediction, and emergency confidence" />
                <CardContent>
                  <ConfidenceOverview agents={snapshot.agents} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader title="Data Pipeline" description="How data flows from the field into the AI Supervisor" />
                <CardContent>
                  <PipelineWorkflow />
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Agent Workflow" description="How each agent feeds the AI Supervisor" />
                <CardContent>
                  <WorkflowGraph agents={snapshot.agents} processingState={snapshot.processingState} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader
                title="Raw AI Reasoning"
                description="Backend reasoning for the selected decision via POST /ai/explain"
              />
              <CardContent>
                <AIReasoningPanel data={aiExplain.data} loading={aiExplain.loading} error={aiExplain.error} />
              </CardContent>
            </Card>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
