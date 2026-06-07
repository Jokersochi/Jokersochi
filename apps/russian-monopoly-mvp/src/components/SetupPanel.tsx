import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { GamePreset } from '../config/types';

interface TokenOption {
  id: string;
  name: string;
  asset: string;
}

interface PlayerConfig {
  name: string;
  token: string;
}

interface SetupPanelProps {
  tokens: TokenOption[];
  defaultNames: string[];
  presets: Record<string, GamePreset>;
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  onStart: (players: PlayerConfig[], preset: string) => void;
  isLoading: boolean;
  t: (key: string) => string;
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export function SetupPanel({
  tokens,
  defaultNames,
  presets,
  selectedPreset,
  onPresetChange,
  onStart,
  isLoading,
  t
}: SetupPanelProps) {
  const [playerCount, setPlayerCount] = useState(4);
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>(() =>
    Array.from({ length: MAX_PLAYERS }, (_, index) => ({
      name: defaultNames[index] ?? `Игрок ${index + 1}`,
      token: tokens[index % tokens.length]?.id ?? ''
    }))
  );

  useEffect(() => {
    setPlayerConfigs((prev) =>
      prev.map((config, index) => ({
        ...config,
        name: config.name || defaultNames[index] || `Игрок ${index + 1}`,
        token: config.token || tokens[index % tokens.length]?.id || ''
      }))
    );
  }, [defaultNames, tokens]);

  const takenTokens = useMemo(() =>
    new Set(playerConfigs.slice(0, playerCount).map((config) => config.token)),
  [playerConfigs, playerCount]);

  const handlePlayerCountChange = (event: FormEvent<HTMLSelectElement>) => {
    const value = Number(event.currentTarget.value);
    setPlayerCount(value);
  };

  const handleNameChange = (index: number, name: string) => {
    setPlayerConfigs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    });
  };

  const handleTokenChange = (index: number, token: string) => {
    setPlayerConfigs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], token };
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const players = playerConfigs.slice(0, playerCount).map((config, index) => ({
      name: config.name.trim() || `Игрок ${index + 1}`,
      token: config.token || tokens[index % tokens.length]?.id || tokens[0]?.id || 'default'
    }));
    onStart(players, selectedPreset);
  };

  const presetEntries = Object.entries(presets);

  return (
    <section
      aria-labelledby="setup-heading"
      className="mx-auto flex max-w-5xl flex-col gap-6 rounded-3xl bg-surface p-6 shadow-soft"
    >
      <header className="flex flex-col gap-2">
        <h2 id="setup-heading" className="text-2xl font-semibold">
          {t('SETUP_HEADING')}
        </h2>
        <p className="text-sm text-slate-500">{t('SETUP_SUBHEADING')}</p>
      </header>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" aria-live="polite">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{t('PLAYER_COUNT')}</span>
            <select
              className="rounded-2xl border border-slate-200 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-accent"
              value={playerCount}
              onChange={handlePlayerCountChange}
              aria-describedby="player-count-hint"
            >
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, index) => {
                const value = MIN_PLAYERS + index;
                return (
                  <option key={value} value={value}>
                    {value}
                  </option>
                );
              })}
            </select>
            <span id="player-count-hint" className="text-xs text-slate-500">
              {t('PLAYER_COUNT_HINT')}
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{t('PRESET_LABEL')}</span>
            <select
              className="rounded-2xl border border-slate-200 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-accent"
              value={selectedPreset}
              onChange={(event) => onPresetChange(event.currentTarget.value)}
            >
              {presetEntries.map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              {presets[selectedPreset]?.description}
            </span>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {playerConfigs.slice(0, playerCount).map((config, index) => {
            const availableTokens = tokens.filter(
              (token) => !takenTokens.has(token.id) || token.id === config.token
            );
            return (
              <fieldset
                key={index}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4"
                aria-label={`${t('PLAYER_CARD_LABEL')} ${index + 1}`}
              >
                <legend className="text-sm font-semibold text-slate-600">
                  {t('PLAYER')} {index + 1}
                </legend>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">{t('PLAYER_NAME')}</span>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(event) => handleNameChange(index, event.currentTarget.value)}
                    className="rounded-2xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">{t('TOKEN')}</span>
                  <select
                    value={config.token}
                    onChange={(event) => handleTokenChange(index, event.currentTarget.value)}
                    className="rounded-2xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {availableTokens.map((tokenOption) => (
                      <option key={tokenOption.id} value={tokenOption.id}>
                        {tokenOption.name}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
            );
          })}
        </div>
        <button
          type="submit"
          className="self-start rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-accent/90 focus-visible:outline-none"
          disabled={isLoading || presetEntries.length === 0}
        >
          {isLoading ? t('LOADING_LABEL') : t('START_GAME')}
        </button>
      </form>
    </section>
  );
}
