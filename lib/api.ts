// Mock API functions for each AI model
const mockResponses = {
  chatgpt: `Certainly! Here's a comprehensive overview:

**Definition**: Artificial Intelligence (AI) refers to computer systems designed to perform tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation.

**Top 3 Trends for 2026**:
1. **Multimodal AI Systems**: Integration of vision, audio, and text processing in unified models
2. **Edge AI Computing**: Deployment of AI models on local devices for privacy and efficiency
3. **AI Governance Frameworks**: Standardized regulations and ethical guidelines for AI deployment

**Business Applications**:
- Customer service automation
- Predictive analytics for market trends
- Supply chain optimization
- Personalized marketing campaigns`,
  
  gemini: `Artificial Intelligence is transforming how we interact with technology:

**Core Definition**: AI encompasses algorithms and statistical models that enable computers to perform cognitive tasks.

**2026 Forecast**:
1. **Neuromorphic Computing**: Hardware designed to mimic neural structures
2. **Quantum Machine Learning**: Leveraging quantum computing for complex problem-solving
3. **Explainable AI (XAI)**: Making AI decisions transparent and interpretable

**Commercial Impact**:
- Enhanced operational efficiency
- Advanced data insights
- Automated routine processes
- Improved customer experiences`,
  
  claude: `A thorough examination of artificial intelligence reveals:

**Foundational Concept**: AI involves creating systems capable of learning, reasoning, and problem-solving through pattern recognition and data analysis.

**Emerging Trends in 2026**:
1. **Federated Learning**: Training models across decentralized datasets while preserving privacy
2. **Synthetic Data Generation**: Creating artificial datasets for model training
3. **AI-Human Collaboration**: Seamless integration of human and artificial intelligence

**Enterprise Value**:
- Cost reduction through automation
- Innovation acceleration
- Risk mitigation strategies
- Competitive advantage through insights`,
  
  grok: `Here's the real talk about AI:

**What It Actually Is**: AI is software that learns patterns from data to make predictions or classifications without explicit programming for each scenario.

**The Real 2026 Trends**:
1. **Compute-Efficient Models**: Development of smaller, faster AI models
2. **Domain-Specific AI**: Specialized models for industries like healthcare, finance
3. **AI Democratization**: Tools making AI accessible to non-experts

**Bottom Line for Business**:
- ROI-focused implementations
- Process automation gains
- New revenue opportunities
- Competitive positioning`
};

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchChatGPT = async (prompt: string): Promise<string> => {
  await delay(800 + Math.random() * 400); // 800-1200ms delay
  return mockResponses.chatgpt;
};

export const fetchGemini = async (prompt: string): Promise<string> => {
  await delay(1000 + Math.random() * 500); // 1000-1500ms delay
  return mockResponses.gemini;
};

export const fetchClaude = async (prompt: string): Promise<string> => {
  await delay(1200 + Math.random() * 600); // 1200-1800ms delay
  return mockResponses.claude;
};

export const fetchGrok = async (prompt: string): Promise<string> => {
  await delay(700 + Math.random() * 300); // 700-1000ms delay
  return mockResponses.grok;
};

// Main function to process query with all models in parallel
export const processQueryWithModels = async (prompt: string) => {
  const [chatgpt, gemini, claude, grok] = await Promise.allSettled([
    fetchChatGPT(prompt),
    fetchGemini(prompt),
    fetchClaude(prompt),
    fetchGrok(prompt)
  ]);

  return {
    chatgpt: chatgpt.status === 'fulfilled' ? chatgpt.value : 'Error fetching response',
    gemini: gemini.status === 'fulfilled' ? gemini.value : 'Error fetching response',
    claude: claude.status === 'fulfilled' ? claude.value : 'Error fetching response',
    grok: grok.status === 'fulfilled' ? grok.value : 'Error fetching response'
  };
};