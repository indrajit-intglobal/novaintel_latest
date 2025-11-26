import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, TrendingDown, Lightbulb } from "lucide-react";

interface BattleCard {
  competitor: string;
  weaknesses: string[];
  feature_gaps: string[];
  recommendations: string[];
  detected_mentions?: string[];
}

interface BattleCardSidebarProps {
  projectId: number;
  battleCards?: BattleCard[];
}

export function BattleCardSidebar({ projectId, battleCards = [] }: BattleCardSidebarProps) {
  const [cards, setCards] = useState<BattleCard[]>(battleCards);

  useEffect(() => {
    // Listen for WebSocket battle card updates
    // This would connect to WebSocket and update cards in real-time
    // For now, use props
    setCards(battleCards);
  }, [battleCards]);

  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Battle Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No competitors detected in RFP yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Battle Cards</CardTitle>
        <p className="text-sm text-muted-foreground">
          Competitive intelligence for this RFP
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {cards.map((card, index) => (
              <Card key={index} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{card.competitor}</CardTitle>
                    <Badge variant="outline">Competitor</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {card.weaknesses.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <h4 className="font-semibold text-sm">Weaknesses</h4>
                      </div>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        {card.weaknesses.map((weakness, i) => (
                          <li key={i}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {card.feature_gaps.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <h4 className="font-semibold text-sm">Feature Gaps</h4>
                      </div>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        {card.feature_gaps.map((gap, i) => (
                          <li key={i}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {card.recommendations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        <h4 className="font-semibold text-sm">Recommendations</h4>
                      </div>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        {card.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

