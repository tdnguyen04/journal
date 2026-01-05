import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Activity, Tag, Brain } from "lucide-react";
import { Analysis } from "@/lib/validations/analysis"; // Use the type we created

export function AnalysisView({ analysis }: { analysis: Analysis }) {
  // Helper for sentiment color
  const getSentimentColor = (s: string) => {
    switch (s) {
      case 'Positive': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Negative': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
      {/* 1. Summary & Sentiment */}
      <div className="flex items-start gap-3">
        <Badge variant="outline" className={`${getSentimentColor(analysis.sentiment)} h-fit shrink-0`}>
          {analysis.sentiment}
        </Badge>
        <p className="text-sm text-muted-foreground italic leading-relaxed">
          "{analysis.summary}"
        </p>
      </div>

      {/* 2. Metrics Grid (The Gym Stats / Custom Trackers) */}
      {analysis.metrics && analysis.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {analysis.metrics.map((metric, i) => (
            <Card key={i} className="p-3 bg-slate-50 dark:bg-slate-900 border-none">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {metric.label}
                </span>
              </div>
              <div className="text-sm font-bold pl-5">
                {metric.value}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 3. Tags */}
      {analysis.tags && analysis.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {analysis.tags.map((tag, i) => (
            <div key={i} className="flex items-center text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
              <Tag className="h-3 w-3 mr-1 opacity-70" />
              {tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}