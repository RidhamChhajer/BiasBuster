import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BiasReport } from '@/services/api';
import { Download, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BiasReportCardProps {
  report: BiasReport;
  onDownload: () => void;
}

const BiasReportCard = ({ report, onDownload }: BiasReportCardProps) => {
  const isBiased = report.result === 'Bias';

  return (
    <Card className="max-w-3xl glass-card rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isBiased ? "bg-destructive/10" : "bg-primary/10"
            )}
          >
            {isBiased ? (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            ) : (
              <CheckCircle className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold">Bias Analysis Result</h3>
            <p
              className={cn(
                "text-sm font-medium",
                isBiased ? "text-destructive" : "text-primary"
              )}
            >
              {report.result}
            </p>
          </div>
        </div>
        <Button
          onClick={onDownload}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* Explanation */}
      <div className="space-y-2">
        <h4 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Explanation
        </h4>
        <p className="text-muted-foreground leading-relaxed">
          {report.explanation}
        </p>
      </div>

      {/* How to Fix */}
      <div className="space-y-2 pt-2 border-t border-border">
        <h4 className="font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-accent" />
          How to Fix
        </h4>
        <p className="text-muted-foreground leading-relaxed">
          {report.howToFix}
        </p>
      </div>
    </Card>
  );
};

export default BiasReportCard;
