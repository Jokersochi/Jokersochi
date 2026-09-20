import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ModelCardProps {
  title: string;
  color: string;
  response?: string;
  isLoading: boolean;
}

export default function ModelCard({ title, color, response, isLoading }: ModelCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Mock trends data for each model
  const getTrends = () => {
    if (title.includes('Grok')) {
      return { topic: '#AI', posts: 127 };
    } else if (title.includes('Claude')) {
      return { topic: '#Research', posts: 89 };
    } else if (title.includes('Gemini')) {
      return { topic: '#Tech', posts: 156 };
    } else {
      return { topic: '#Innovation', posts: 203 };
    }
  };

  const trends = getTrends();

  return (
    <Card 
      className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl shadow-xl h-full flex flex-col"
      style={{
        borderLeft: `4px solid ${color}`
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>{trends.topic}: {trends.posts} posts</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-[200px] overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/6" />
          </div>
        ) : response ? (
          <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
            {response}
          </ReactMarkdown>
        ) : (
          <p className="text-muted-foreground italic">Response pending...</p>
        )}
      </div>
      
      {!isLoading && response && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="h-3 w-3" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </Card>
  );
}