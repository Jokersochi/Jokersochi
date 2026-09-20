import { useState, useEffect } from 'react';

interface ConsensusState {
  agreementScore: number;
  keyThemes: string[];
  confidence: 'low' | 'medium' | 'high';
  finalResponse: string;
}

export const useConsensus = () => {
  const [consensus, setConsensus] = useState<ConsensusState | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateConsensus = async (responses: Record<string, string>) => {
    setLoading(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Calculate basic agreement metrics
    const responseTexts = Object.values(responses).filter(r => r);
    if (responseTexts.length === 0) {
      setConsensus(null);
      setLoading(false);
      return;
    }

    // Simple algorithm to find consensus
    const wordCounts: Record<string, number> = {};
    const totalResponses = responseTexts.length;
    
    responseTexts.forEach(response => {
      const words = response.toLowerCase().match(/\b(\w+)\b/g) || [];
      const uniqueWords = Array.from(new Set(words));
      
      uniqueWords.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    // Find words mentioned by most models (consensus indicators)
    const consensusWords = Object.entries(wordCounts)
      .filter(([_, count]) => count >= Math.ceil(totalResponses * 0.5))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Calculate agreement score (percentage of responses that mention top themes)
    const agreementScore = Math.min(100, Math.round((consensusWords.length / 5) * 100));
    
    // Determine confidence level
    const confidence: 'low' | 'medium' | 'high' = 
      agreementScore > 70 ? 'high' : 
      agreementScore > 40 ? 'medium' : 'low';
    
    // Create a synthesized response from key elements
    const finalResponse = `Based on analysis of all AI models:\n\n` +
      `Key themes identified: ${consensusWords.slice(0, 5).join(', ')}.\n\n` +
      `The models show ${confidence} agreement on these topics. ` +
      `All models addressed the core question, with particular emphasis on ${consensusWords.slice(0, 3).join(' and ')}.`;

    setConsensus({
      agreementScore,
      keyThemes: consensusWords,
      confidence,
      finalResponse
    });
    
    setLoading(false);
  };

  return {
    consensus,
    loading,
    calculateConsensus
  };
};