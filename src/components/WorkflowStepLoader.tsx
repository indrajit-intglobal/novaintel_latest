import { CheckCircle2, Loader2 } from "lucide-react";

interface WorkflowStep {
  id: string;
  label: string;
  workflowStep: string;
}

interface WorkflowStatus {
  status?: "running" | "pending" | "completed" | "error" | "not_started";
  current_step?: string;
  progress?: Record<string, boolean>;
  execution_log?: Array<{ step: string; status: string }>;
}

interface WorkflowStepLoaderProps {
  workflowStatus?: WorkflowStatus | null;
  steps?: WorkflowStep[]; // Optional custom steps, otherwise uses default
}

// Default workflow steps
const DEFAULT_STEPS: WorkflowStep[] = [
  { id: "rfp_analyzer", label: "Analyzing RFP Document", workflowStep: "rfp_analyzer" },
  { id: "challenge_extractor", label: "Extracting Business Challenges", workflowStep: "challenge_extractor" },
  { id: "value_proposition", label: "Generating Value Propositions", workflowStep: "value_proposition" },
  { id: "discovery_question", label: "Creating Discovery Questions", workflowStep: "discovery_question" },
  { id: "case_study_matcher", label: "Matching Case Studies", workflowStep: "case_study_matcher" },
  { id: "proposal_builder", label: "Building Proposal", workflowStep: "proposal_builder" },
];

// Analysis Step Component
function AnalysisStep({ 
  label, 
  isActive, 
  isComplete 
}: { 
  label: string; 
  isActive: boolean; 
  isComplete: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center relative">
        {isComplete ? (
          <>
            {/* Green checkmark with background circle */}
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-pulse" />
            <CheckCircle2 className="h-6 w-6 text-green-500 relative z-10" />
          </>
        ) : isActive ? (
          <>
            {/* Spinning loader with pulsing background */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
            <Loader2 className="h-6 w-6 text-primary animate-spin relative z-10" />
          </>
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>
      <span
        className={`text-sm ${
          isComplete
            ? "text-green-600 dark:text-green-400"
            : isActive
            ? "text-primary font-medium"
            : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function WorkflowStepLoader({ workflowStatus, steps = DEFAULT_STEPS }: WorkflowStepLoaderProps) {
  return (
    <div className="w-full space-y-0">
      {steps.map((step, index) => {
        // Determine step status from workflow status
        let isActive = false;
        let isComplete = false;
        
        if (workflowStatus) {
          const progress = workflowStatus.progress || {};
          const currentStep = workflowStatus.current_step;
          const workflowStepId = step.workflowStep;
          
          // Check if step is complete
          isComplete = progress[workflowStepId] === true;
          
          // Check if step is currently active
          if (workflowStatus.status === "running") {
            // Step is active if it matches the current_step from workflow
            // Or if it's the first incomplete step
            isActive = currentStep === workflowStepId || 
                      (!isComplete && !steps.slice(0, index).some(s => !progress[s.workflowStep]));
          } else if (workflowStatus.status === "completed") {
            // All steps should be complete when workflow is done
            isComplete = true;
          } else if (workflowStatus.status === "pending" || workflowStatus.status === "not_started") {
            // Show first step as active when pending
            isActive = index === 0;
          }
        } else {
          // No workflow status yet, show first step as active
          isActive = index === 0;
        }
        
        const isLast = index === steps.length - 1;
        
        return (
          <div key={step.id} className="relative">
            <AnalysisStep 
              label={step.label} 
              isActive={isActive}
              isComplete={isComplete}
            />
            {/* Connecting line between steps */}
            {!isLast && (
              <div className="absolute left-4 top-10 h-8 w-0.5">
                {isComplete ? (
                  <div className="h-full w-full bg-green-500" />
                ) : (
                  <div className="h-full w-full bg-muted-foreground/20" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

