'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Copy, RotateCcw, Moon, Sun, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';
import Optimizer from '@/components/Optimizer';
import ModelCard from '@/components/ModelCard';
import { useConsensus } from '@/hooks/useConsensus';
import { processQueryWithModels } from '@/lib/api';
import { generateConsensus } from '@/lib/consensus';

export default function Home() {
  const [input, setInput] = useState('');
  const [optimizedInput, setOptimizedInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<any>({});
  const [consensusResult, setConsensusResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('input');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { theme, setTheme } = useTheme();

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      // Optimize the prompt
      setOptimizedInput(`Ты эксперт в области искусственного интеллекта. Ответь структурировано: 1) Определение 2) Топ-3 тренда 2026 3) Применение в бизнесе. <500 слов, источники [ ].\n\n${input}`);

      // Get responses from all models
      const responses = await processQueryWithModels(optimizedInput);
      setResponses(responses);

      // Generate consensus
      const consensus = generateConsensus(responses);
      setConsensusResult(consensus);
      
      setActiveTab('results');
    } catch (error) {
      console.error('Error processing query:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Multi-AI Consilium</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 space-y-6"
          >
            {activeTab === 'input' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="query" className="block text-sm font-medium mb-2">
                          Enter your query
                        </label>
                        <Textarea
                          id="query"
                          ref={textareaRef}
                          placeholder="Ask anything..."
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="min-h-[180px] resize-none text-lg leading-relaxed"
                        />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Press Cmd+Enter to submit
                        </p>
                      </div>
                      
                      <Optimizer original={input} optimized={optimizedInput} />
                      
                      <Button 
                        onClick={handleSubmit} 
                        disabled={!input.trim() || isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Submit to All Models
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'results' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ModelCard
                    title="🤖 ChatGPT"
                    color="#10a37f"
                    response={responses.chatgpt}
                    isLoading={isLoading}
                  />
                  <ModelCard
                    title="✨ Gemini"
                    color="#4285f4"
                    response={responses.gemini}
                    isLoading={isLoading}
                  />
                  <ModelCard
                    title="🧠 Claude"
                    color="#cc785c"
                    response={responses.claude}
                    isLoading={isLoading}
                  />
                  <ModelCard
                    title="⚡ Grok"
                    color="#1d9bf0"
                    response={responses.grok}
                    isLoading={isLoading}
                  />
                </div>

                {consensusResult && (
                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-4 flex items-center">
                        <Sparkles className="mr-2 h-5 w-5 text-primary" />
                        Consensus Result
                      </h3>
                      <div className="prose dark:prose-invert max-w-none">
                        {consensusResult.finalResponse}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(consensusResult.finalResponse)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        </Tabs>
      </main>
    </div>
  );
}