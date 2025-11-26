import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Loader2 } from "lucide-react";

interface AudioBriefingPlayerProps {
  audioUrl?: string;
  script?: string;
  projectId: number;
  onGenerate?: () => Promise<void>;
}

export function AudioBriefingPlayer({
  audioUrl,
  script,
  projectId,
  onGenerate,
}: AudioBriefingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    if (!audioUrl) {
      // Generate audio if not available
      if (onGenerate) {
        handleGenerate();
      }
      return;
    }

    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    } else {
      const newAudio = new Audio(audioUrl);
      newAudio.addEventListener("ended", () => setIsPlaying(false));
      newAudio.play();
      setAudio(newAudio);
      setIsPlaying(true);
    }
  };

  const handleGenerate = async () => {
    if (!onGenerate) return;
    setIsGenerating(true);
    try {
      await onGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement("a");
      link.href = audioUrl;
      link.download = `briefing-${projectId}.mp3`;
      link.click();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio Briefing</CardTitle>
        <p className="text-sm text-muted-foreground">
          Listen to an executive summary of this RFP
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!audioUrl && !script && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              No audio briefing available yet.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              variant="outline"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Audio Briefing"
              )}
            </Button>
          </div>
        )}

        {script && !audioUrl && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Script generated. Audio conversion pending.
            </p>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm whitespace-pre-wrap">{script}</p>
            </div>
          </div>
        )}

        {audioUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePlay}
                size="sm"
                variant={isPlaying ? "secondary" : "default"}
              >
                {isPlaying ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Play
                  </>
                )}
              </Button>
              <Button onClick={handleDownload} size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            {script && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs font-semibold mb-2">Transcript:</p>
                <p className="text-sm whitespace-pre-wrap">{script}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

