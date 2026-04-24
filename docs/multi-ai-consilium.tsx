'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Brain,
  CheckCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Zap,
  Loader2,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';

const REQUEST_TIMEOUT_MS = 3500;
const OPTIMIZE_DELAY_MS = 800;
const CONSENSUS_DELAY_MS = 1200;
const CONSENSUS_SCROLL_DELAY_MS = 300;

const MODEL_DEFINITIONS = [
  {
    id: 'chatgpt',
    name: 'GPT-4 Turbo',
    icon: Brain,
    accentClass: 'border-green-500',
    iconClass: 'text-green-600 dark:text-green-400',
    badgeClass: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'gemini',
    name: 'Gemini Pro',
    icon: Sparkles,
    accentClass: 'border-blue-500',
    iconClass: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'claude',
    name: 'Claude 3',
    icon: CheckCircle,
    accentClass: 'border-purple-500',
    iconClass: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'bg-purple-100 dark:bg-purple-900/30',
  },
] as const;

type ModelId = (typeof MODEL_DEFINITIONS)[number]['id'];

interface ModelResponse {
  id: ModelId;
  name: string;
  content: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  latency?: number;
  tokens?: number;
  errorMessage?: string;
}

interface ConsensusResult {
  bestAnswer: string;
  analysis: {
    strengths: string[];
    weaknesses: Record<ModelId, string[]>;
    improvements: string[];
  };
  confidence: number;
}

interface State {
  input: string;
  isLoading: boolean;
  optimizedPrompt: string;
  modelResponses: ModelResponse[];
  consensus: ConsensusResult | null;
  expandedCard: ModelId | null;
  focusMode: boolean;
  errorMessage: string | null;
}

type Action =
  | { type: 'set_input'; payload: string }
  | { type: 'set_loading'; payload: boolean }
  | { type: 'set_optimized_prompt'; payload: string }
  | { type: 'set_model_responses'; payload: ModelResponse[] }
  | { type: 'set_consensus'; payload: ConsensusResult | null }
  | { type: 'set_expanded'; payload: ModelId | null }
  | { type: 'toggle_focus' }
  | { type: 'set_error'; payload: string | null }
  | { type: 'reset_results' };

const initialState: State = {
  input: '',
  isLoading: false,
  optimizedPrompt: '',
  modelResponses: [],
  consensus: null,
  expandedCard: null,
  focusMode: false,
  errorMessage: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set_input':
      return { ...state, input: action.payload };
    case 'set_loading':
      return { ...state, isLoading: action.payload };
    case 'set_optimized_prompt':
      return { ...state, optimizedPrompt: action.payload };
    case 'set_model_responses':
      return { ...state, modelResponses: action.payload };
    case 'set_consensus':
      return { ...state, consensus: action.payload };
    case 'set_expanded':
      return { ...state, expandedCard: action.payload };
    case 'toggle_focus':
      return { ...state, focusMode: !state.focusMode };
    case 'set_error':
      return { ...state, errorMessage: action.payload };
    case 'reset_results':
      return {
        ...state,
        optimizedPrompt: '',
        modelResponses: [],
        consensus: null,
        expandedCard: null,
        errorMessage: null,
      };
    default:
      return state;
  }
}

const createInitialResponses = (): ModelResponse[] =>
  MODEL_DEFINITIONS.map((model) => ({
    id: model.id,
    name: model.name,
    content: '',
    status: 'idle',
  }));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error('Время ожидания ответа истекло.'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
};

const buildOptimizedPrompt = async (prompt: string): Promise<string> => {
  await wait(OPTIMIZE_DELAY_MS);

  return `Требуется предоставить подробный, структурированный ответ на следующий запрос:\n\nЗАПРОС: "${prompt}"\n\nТРЕБОВАНИЯ К ОТВЕТУ:\n1. Дайте полный, развернутый ответ\n2. Структурируйте информацию логически\n3. Приведите примеры, если уместно\n4. Укажите источники или обоснования\n5. Выделите ключевые выводы\n\nФОРМАТ ОТВЕТА:\n- Краткое введение\n- Основные пункты с детализацией\n- Практические рекомендации\n- Заключение с выводами`;
};

const fetchModelResponse = async (modelId: ModelId, prompt: string): Promise<string> => {
  await wait(Math.random() * 1000 + 500);

  const responses: Record<ModelId, string> = {
    chatgpt: `GPT-4 отвечает: На основе анализа запроса "${prompt.slice(0, 50)}...", я могу предоставить следующее:\n\n1. Ключевой аспект — это важность структурированного подхода...\n\n2. Основные выводы включают...\n\n3. Рекомендации для реализации...`,
    gemini: `Gemini Pro анализирует: В вашем запросе я вижу несколько важных компонентов:\n\n• Первичная тема требует уточнения...\n• Технические аспекты включают...\n• Практическое применение может быть...`,
    claude: `Claude 3 предлагает: Исходя из предоставленного контекста, наиболее эффективный путь решения включает:\n\n- Фундаментальный анализ проблемы\n- Систематический подход к решению\n- Критерии оценки результатов\n- Поэтапный план действий`,
  };

  return responses[modelId];
};

const runConsensus = async (responses: ModelResponse[]): Promise<ConsensusResult> => {
  await wait(CONSENSUS_DELAY_MS);

  return {
    bestAnswer: `На основе консилиума 3 AI-моделей, лучший синтезированный ответ:\n\n${responses[0].content.slice(0, 200)}... [полный синтез всех ответов с устранением противоречий и усилением сильных сторон каждой модели].\n\nКлючевые улучшения:\n1. Объединена точность GPT-4 с креативностью Gemini\n2. Учтена структурная ясность Claude 3\n3. Устранены мелкие неточности из исходных ответов`,
    analysis: {
      strengths: [
        'GPT-4 показал лучшую точность фактов',
        'Gemini предложил наиболее креативные решения',
        'Claude 3 обеспечил лучшую структуру ответа',
      ],
      weaknesses: {
        chatgpt: ['Некоторое избыточное повторение'],
        gemini: ['Недостаточно конкретных примеров'],
        claude: ['Слишком формальный тон'],
      },
      improvements: [
        'Синтезированы сильные стороны всех моделей',
        'Устранены противоречия в данных',
        'Добавлены практические рекомендации',
      ],
    },
    confidence: 92,
  };
};

const getModelMeta = (modelId: ModelId) =>
  MODEL_DEFINITIONS.find((model) => model.id === modelId);

export default function HomePage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const models = useMemo(() => createInitialResponses(), []);

  const averageLatency = useMemo(() => {
    const latencies = state.modelResponses
      .map((response) => response.latency)
      .filter((latency): latency is number => typeof latency === 'number');

    if (!latencies.length) return 0;

    return Math.round(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length);
  }, [state.modelResponses]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmedInput = state.input.trim();

      if (!trimmedInput || state.isLoading) {
        return;
      }

      dispatch({ type: 'set_loading', payload: true });
      dispatch({ type: 'reset_results' });

      try {
        const optimized = await buildOptimizedPrompt(trimmedInput);
        dispatch({ type: 'set_optimized_prompt', payload: optimized });

        const responses = await Promise.all(
          models.map(async (model) => {
            const startTime = Date.now();

            try {
              const content = await withTimeout(
                fetchModelResponse(model.id, optimized),
                REQUEST_TIMEOUT_MS,
              );
              const latency = Date.now() - startTime;

              return {
                ...model,
                content,
                status: 'success' as const,
                latency,
                tokens: 250,
              };
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Не удалось получить ответ.';

              return {
                ...model,
                content: '',
                status: 'error' as const,
                errorMessage: message,
              };
            }
          }),
        );

        if (!isMounted.current) return;

        dispatch({ type: 'set_model_responses', payload: responses });

        const consensusResult = await runConsensus(responses);
        dispatch({ type: 'set_consensus', payload: consensusResult });

        setTimeout(() => {
          document.getElementById('consensus-result')?.scrollIntoView({
            behavior: 'smooth',
          });
        }, CONSENSUS_SCROLL_DELAY_MS);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Произошла неизвестная ошибка.';
        dispatch({ type: 'set_error', payload: message });
      } finally {
        if (isMounted.current) {
          dispatch({ type: 'set_loading', payload: false });
        }
      }
    },
    [models, state.input, state.isLoading],
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Скопировано!');
      setTimeout(() => setCopyStatus(null), 1500);
    } catch (error) {
      setCopyStatus('Не удалось скопировать.');
      console.error(error);
    }
  }, []);

  const toggleExpand = useCallback(
    (id: ModelId) => {
      dispatch({ type: 'set_expanded', payload: state.expandedCard === id ? null : id });
    },
    [state.expandedCard],
  );

  const toggleFocus = useCallback(() => {
    dispatch({ type: 'toggle_focus' });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                  Multi-AI Consilium
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Мудрость трех моделей в одном ответе
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant={state.focusMode ? 'default' : 'outline'}
                size="sm"
                onClick={toggleFocus}
              >
                {state.focusMode ? 'Показать все' : 'Режим фокуса'}
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                value={state.input}
                onChange={(event) => dispatch({ type: 'set_input', payload: event.target.value })}
                placeholder="Введите ваш запрос... Например: 'Объясни квантовую запутанность простыми словами'"
                className="h-16 text-lg pr-12 rounded-2xl border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={state.isLoading}
              />
              <Button
                type="submit"
                disabled={state.isLoading || !state.input.trim()}
                className="absolute right-2 top-2 h-12 px-6 rounded-xl"
                size="lg"
              >
                {state.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Запустить 3 модели
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                <span>Улучшение промта</span>
              </div>
              <div className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                <span>Параллельные ответы</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                <span>Консилиум моделей</span>
              </div>
            </div>

            {state.errorMessage && (
              <p className="text-center text-sm text-red-500">{state.errorMessage}</p>
            )}
          </form>
        </motion.div>

        <AnimatePresence>
          {state.optimizedPrompt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-4xl mx-auto mb-8"
            >
              <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-lg">
                      <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                      Улучшенный промт
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(state.optimizedPrompt)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Копировать
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-blue-100 dark:border-blue-900">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
                      {state.optimizedPrompt}
                    </pre>
                    {copyStatus && (
                      <p className="mt-2 text-xs text-blue-500">{copyStatus}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {state.modelResponses.length > 0 && !state.focusMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Параллельные ответы
                </h2>
                <Badge variant="outline" className="text-sm">
                  3 модели · {averageLatency}мс
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {state.modelResponses.map((model) => {
                  const meta = getModelMeta(model.id);

                  if (!meta) return null;

                  const Icon = meta.icon;

                  return (
                    <motion.div
                      key={model.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: state.modelResponses.indexOf(model) * 0.1 }}
                    >
                      <Card className={`h-full border-l-4 ${meta.accentClass}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${meta.badgeClass}`}>
                                <Icon className={`h-5 w-5 ${meta.iconClass}`} />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{model.name}</CardTitle>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {model.status === 'success'
                                    ? `${model.latency}мс · ${model.tokens ?? 250} токенов`
                                    : model.status === 'error'
                                      ? 'Ошибка получения ответа'
                                      : 'В процессе'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(model.id)}
                              >
                                {state.expandedCard === model.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(model.content)}
                                disabled={model.status !== 'success'}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <div
                            className={`space-y-4 ${
                              state.expandedCard === model.id ? '' : 'max-h-96 overflow-y-auto'
                            }`}
                          >
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              {model.status === 'error' ? (
                                <p className="text-sm text-red-500">{model.errorMessage}</p>
                              ) : (
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {model.content || 'Ответ формируется...'}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {state.consensus && (
            <motion.div
              id="consensus-result"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto"
            >
              <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">
                          Решение консилиума — лучший ответ
                        </CardTitle>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-48">
                              <Progress value={state.consensus.confidence} className="h-2" />
                            </div>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              Уверенность: {state.consensus.confidence}%
                            </span>
                          </div>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Синтез 3 моделей
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(state.consensus?.bestAnswer ?? '')}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Копировать ответ
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="p-6 bg-white/70 dark:bg-gray-900/70 rounded-xl border border-green-100 dark:border-green-900">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                      🏆 Лучший синтезированный ответ
                    </h3>
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                        {state.consensus.bestAnswer}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">
                        ✅ Сильные стороны моделей
                      </h4>
                      <ul className="space-y-2">
                        {state.consensus.analysis.strengths.map((strength) => (
                          <li key={strength} className="flex items-start">
                            <div className="h-2 w-2 rounded-full bg-green-500 mt-2 mr-3" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {strength}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-amber-600 dark:text-amber-400">
                        ⚠️ Устраненные слабости
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(state.consensus.analysis.weaknesses).map(
                          ([model, weaknesses]) => (
                            <div key={model}>
                              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                {model === 'chatgpt'
                                  ? 'GPT-4'
                                  : model === 'gemini'
                                    ? 'Gemini'
                                    : 'Claude'}
                              </p>
                              <ul className="space-y-1">
                                {weaknesses.map((weakness) => (
                                  <li key={weakness} className="text-sm text-gray-600 dark:text-gray-400">
                                    • {weakness}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">
                        🚀 Внесенные улучшения
                      </h4>
                      <ul className="space-y-2">
                        {state.consensus.analysis.improvements.map((improvement) => (
                          <li key={improvement} className="flex items-start">
                            <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 mr-3" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {improvement}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {state.focusMode && state.consensus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto"
          >
            <div className="container mx-auto px-6 py-12 max-w-4xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold">Режим фокуса</h1>
                  <p className="text-gray-500 dark:text-gray-400">
                    Только лучший ответ без отвлекающих элементов
                  </p>
                </div>
                <Button variant="outline" onClick={toggleFocus}>
                  Выйти из режима
                </Button>
              </div>

              <div className="prose prose-xl dark:prose-invert max-w-none">
                <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl mb-8">
                  <h2 className="text-2xl font-bold mb-4">Ваш запрос:</h2>
                  <p className="text-lg">{state.input}</p>
                </div>

                <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                  <div className="flex items-center mb-6">
                    <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                    <h2 className="text-2xl font-bold">Лучший ответ</h2>
                    <Badge className="ml-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Уверенность: {state.consensus.confidence}%
                    </Badge>
                  </div>

                  <div className="whitespace-pre-wrap text-lg leading-relaxed">
                    {state.consensus.bestAnswer}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
