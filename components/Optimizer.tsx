import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface OptimizerProps {
  original: string;
  optimized: string;
}

export default function Optimizer({ original, optimized }: OptimizerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!original.trim() || !optimized.trim()) {
    return null;
  }

  return (
    <Card className="border-0 bg-muted/30">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Prompt Optimizer</CardTitle>
          {optimized.length > original.length && (
            <Badge variant="secondary" className="text-xs">
              +{Math.round(((optimized.length - original.length) / original.length) * 100)}%
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {expanded && (
        <CardContent className="pt-0 mt-2 space-y-4">
          <div>
            <CardDescription className="text-xs mb-1">Original Prompt</CardDescription>
            <div className="text-sm bg-background p-3 rounded-md border">
              {original || 'Enter a query to see optimization'}
            </div>
          </div>
          
          <div>
            <CardDescription className="text-xs mb-1">Optimized Prompt</CardDescription>
            <div className="text-sm bg-primary/5 p-3 rounded-md border border-primary/20">
              {optimized || 'Optimized version will appear here'}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}