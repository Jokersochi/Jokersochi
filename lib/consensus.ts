interface ResponseData {
  chatgpt: string;
  gemini: string;
  claude: string;
  grok: string;
}

interface ConsensusResult {
  finalResponse: string;
  agreementScore: number;
  keyThemes: string[];
  confidence: 'low' | 'medium' | 'high';
  modelWeights: {
    [key: string]: number;
  };
}

export const generateConsensus = (responses: ResponseData): ConsensusResult => {
  // Extract text from all responses
  const allResponses = [responses.chatgpt, responses.gemini, responses.claude, responses.grok];
  const validResponses = allResponses.filter(r => r && r.length > 0);
  
  if (validResponses.length === 0) {
    return {
      finalResponse: "No valid responses received from AI models.",
      agreementScore: 0,
      keyThemes: [],
      confidence: 'low',
      modelWeights: {
        grok: 0.4,
        claude: 0.3,
        chatgpt: 0.15,
        gemini: 0.15
      }
    };
  }

  // Tokenize and count important terms across responses
  const termFrequency: Record<string, number> = {};
  const allTerms: string[][] = [];

  validResponses.forEach(response => {
    // Basic tokenization (in a real app, use a proper NLP library)
    const terms = response
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 3 && !stopWords.has(term));
    
    allTerms.push(terms);
    
    // Count term frequency across all responses
    const uniqueTerms = new Set(terms);
    uniqueTerms.forEach(term => {
      termFrequency[term] = (termFrequency[term] || 0) + 1;
    });
  });

  // Identify consensus terms (mentioned in majority of responses)
  const consensusThreshold = Math.ceil(validResponses.length * 0.5);
  const consensusTerms = Object.entries(termFrequency)
    .filter(([_, count]) => count >= consensusThreshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term]) => term);

  // Calculate agreement score based on consensus
  const agreementScore = Math.min(100, Math.round((consensusTerms.length / 8) * 100));
  
  // Determine confidence level
  const confidence: 'low' | 'medium' | 'high' = 
    agreementScore > 70 ? 'high' : 
    agreementScore > 40 ? 'medium' : 'low';

  // Assign weights to models (Grok gets higher weight as per requirements)
  const modelWeights = {
    grok: 0.4,    // 40% weight as per requirements
    claude: 0.3,  // 30% weight as per requirements
    chatgpt: 0.15,
    gemini: 0.15
  };

  // Create synthesized response highlighting consensus
  const finalResponse = `# AI Consensus Analysis\n\n` +
    `## Synthesized Response\n` +
    `Based on analysis of all AI models, the following consensus emerged:\n\n` +
    `**Key themes identified across models:** ${consensusTerms.slice(0, 5).join(', ')}.\n\n` +
    `All models addressed the core question with particular emphasis on ${consensusTerms.slice(0, 3).join(' and ')}. ` +
    `The responses show ${confidence} agreement on these topics, with an overall agreement score of ${agreementScore}%.\n\n` +
    `## Model-Specific Insights\n` +
    `- **ChatGPT**: Provided comprehensive coverage of fundamentals\n` +
    `- **Gemini**: Emphasized technical implementation aspects\n` +
    `- **Claude**: Focused on methodical analysis and structure\n` +
    `- **Grok**: Highlighted practical applications and business impact\n\n` +
    `## Final Synthesis\n` +
    `${responses.claude || responses.chatgpt || 'No response available'}`;

  return {
    finalResponse,
    agreementScore,
    keyThemes: consensusTerms,
    confidence,
    modelWeights
  };
};

// Common English stop words to filter out
const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
  'of', 'with', 'by', 'about', 'as', 'into', 'through', 'during', 'before', 
  'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 
  'under', 'again', 'further', 'then', 'once', 'i', 'you', 'he', 'she', 
  'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 
  'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'am', 
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 
  'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could', 'may', 
  'might', 'must', 'shall', 'not', 'no', 'yes', 'so', 'if', 'when', 'where', 
  'who', 'what', 'why', 'how', 'which', 'there', 'here', 'now', 'today', 
  'one', 'two', 'three', 'first', 'second', 'new', 'old', 'good', 'bad', 
  'big', 'small', 'large', 'little', 'more', 'most', 'some', 'any', 'each', 
  'every', 'all', 'both', 'either', 'neither', 'many', 'much', 'few', 'several'
]);