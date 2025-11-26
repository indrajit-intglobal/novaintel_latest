import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Target, Shield, AlertCircle } from "lucide-react";
import { GoNoGoAnalysisResponse } from "@/lib/api";
import { MarkdownText } from "@/components/ui/markdown-text";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GoNoGoAnalysisProps {
  projectId: number;
  rfpDocumentId: number | null;
  icpProfileId?: number;
  onAnalyze: () => Promise<void>;
  analysis?: GoNoGoAnalysisResponse | null;
  isLoading?: boolean;
  error?: string | null;
}

export function GoNoGoAnalysis({
  projectId,
  rfpDocumentId,
  icpProfileId,
  onAnalyze,
  analysis,
  isLoading = false,
  error = null,
}: GoNoGoAnalysisProps) {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "go":
        return "bg-green-100 text-green-700 border-green-300";
      case "no-go":
        return "bg-red-100 text-red-700 border-red-300";
      case "conditional":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case "go":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "no-go":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "conditional":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  if (!analysis && !isLoading && !error) {
    return (
      <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Go/No-Go Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Run a strategic analysis to determine if this opportunity aligns with your ideal customer profile and assess win probability.
          </p>
          <Button onClick={onAnalyze} disabled={isLoading || !rfpDocumentId} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Run Go/No-Go Analysis
              </>
            )}
          </Button>
          {!rfpDocumentId && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Please upload an RFP document first
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Go/No-Go Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing opportunity...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Go/No-Go Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={onAnalyze} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Go/No-Go Analysis
          </CardTitle>
          <Button onClick={onAnalyze} variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Re-analyze"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-6">
            {/* Overall Score and Recommendation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Overall Score</h3>
                  <p className="text-sm text-muted-foreground">Strategic opportunity assessment</p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">out of 100</div>
                </div>
              </div>
              <Progress value={analysis.score} className="h-3" />
              
              <div className="flex items-center gap-3 p-4 rounded-lg border-2 bg-background/50">
                {getRecommendationIcon(analysis.recommendation)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Recommendation:</span>
                    <Badge className={getRecommendationColor(analysis.recommendation)}>
                      {analysis.recommendation.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analysis.recommendation === "go" && "This opportunity aligns well with your ICP and shows strong win potential."}
                    {analysis.recommendation === "no-go" && "This opportunity may not align with your ideal customer profile or has significant risks."}
                    {analysis.recommendation === "conditional" && "This opportunity has potential but requires careful evaluation of specific conditions."}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">ICP Alignment</span>
                  </div>
                  <div className="text-2xl font-bold">{analysis.alignment_score.toFixed(0)}%</div>
                </CardContent>
              </Card>
              <Card className="border-border/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Win Probability</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{analysis.win_probability.toFixed(0)}%</div>
                </CardContent>
              </Card>
              <Card className="border-border/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Competitive Risk</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{analysis.competitive_risk.toFixed(0)}%</div>
                </CardContent>
              </Card>
              <Card className="border-border/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Timeline/Scope Risk</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{analysis.timeline_scope_risk.toFixed(0)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Opportunities */}
            {analysis.opportunities && analysis.opportunities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Opportunities
                </h3>
                <ul className="space-y-2">
                  {analysis.opportunities.map((opp, index) => (
                    <li key={index} className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-sm">{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Factors */}
            {analysis.risk_factors && analysis.risk_factors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Risk Factors
                </h3>
                <ul className="space-y-2">
                  {analysis.risk_factors.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <span className="text-sm">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hidden Signals */}
            {analysis.hidden_signals && analysis.hidden_signals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  Hidden Signals
                </h3>
                <ul className="space-y-2">
                  {analysis.hidden_signals.map((signal, index) => (
                    <li key={index} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <span className="text-sm">{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Analysis */}
            {analysis.detailed_analysis && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Detailed Analysis</h3>
                <div className="p-4 rounded-lg bg-background/50 border border-border/30">
                  <MarkdownText content={analysis.detailed_analysis} className="text-sm" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

