import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/store/useGameStore';
import { useSocket } from '@/hooks/useSocket';
import { palette } from '@/theme/palette';
import { transformMatchSnapshot } from '@/utils/match';

interface LobbyStatePayload {
  id: string;
  hostId: string;
  players: Array<{ playerId: string; displayName: string; ready: boolean; isHost: boolean }>;
  settings: { mode: string; maxPlayers: number; fastMode: boolean; allowSpectators: boolean };
}

export const LobbyScene = () => {
  const { t } = useTranslation();
  const { lobbies, setLobbies, setMatch, setView } = useGameStore();
  const [currentLobby, setCurrentLobby] = useState<LobbyStatePayload | null>(null);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') ?? 'Guest');
  const playerId = useMemo(() => {
    const stored = localStorage.getItem('playerId');
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem('playerId', id);
    return id;
  }, []);

  const lobbySocket = useSocket({
    namespace: '/lobby',
    auth: { playerId, displayName, elo: 1200, trust: 50 },
    onConnect: (socket) => {
      socket.emit('list_lobbies');
    },
  });

  useEffect(() => {
    if (!lobbySocket) return;

    const handleLobbies = (snapshot: Array<{ id: string; settings: { mode: string; maxPlayers: number; fastMode: boolean }; players: unknown[] }>) => {
      setLobbies(
        snapshot.map((item) => ({
          id: item.id,
          mode: item.settings.mode,
          players: (item.players as unknown[]).length,
          maxPlayers: item.settings.maxPlayers,
          fastMode: item.settings.fastMode,
        })),
      );
    };
    const handleLobbyState = (payload: LobbyStatePayload) => setCurrentLobby(payload);
    const handleMatchStart = (payload: any) => {
      const localMatchPlayer = payload.players.find(
        (player: any) => player.externalPlayerId === playerId || player.id === playerId,
      );
      setMatch(transformMatchSnapshot(payload, localMatchPlayer?.id ?? localMatchPlayer?.externalPlayerId));
      setView('game');
    };

    lobbySocket.on('lobbies_snapshot', handleLobbies);
    lobbySocket.on('lobby_state', handleLobbyState);
    lobbySocket.on('match_started', handleMatchStart);

    return () => {
      lobbySocket.off('lobbies_snapshot', handleLobbies);
      lobbySocket.off('lobby_state', handleLobbyState);
      lobbySocket.off('match_started', handleMatchStart);
    };
  }, [lobbySocket, playerId, setLobbies, setMatch, setView]);

  const handleCreateLobby = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    lobbySocket?.emit('create_lobby', {
      mode: formData.get('mode'),
      maxPlayers: Number(formData.get('maxPlayers') ?? 4),
      fastMode: formData.get('fastMode') === 'on',
    });
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem', color: palette.text }}>
      <section style={{ flex: 1 }}>
        <h1>{t('lobby.header')}</h1>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
          {lobbies.map((lobby) => (
            <li
              key={lobby.id}
              style={{
                background: palette.surface,
                borderRadius: '0.75rem',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{lobby.mode}</strong>
                <div style={{ fontSize: '0.85rem', color: palette.muted }}>
                  {lobby.players}/{lobby.maxPlayers} · {lobby.fastMode ? 'Blitz' : 'Advanced'}
                </div>
              </div>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => lobbySocket?.emit('join_lobby', { lobbyId: lobby.id })}
              >
                {t('lobby.join')}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <form
          onSubmit={handleCreateLobby}
          style={{
            background: palette.surface,
            padding: '1rem',
            borderRadius: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <h2 style={{ margin: 0 }}>{t('lobby.create')}</h2>
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(event) => {
              const value = event.target.value;
              setDisplayName(value);
              localStorage.setItem('displayName', value);
            }}
            style={inputStyle}
          />
          <label htmlFor="mode">Mode</label>
          <select id="mode" name="mode" style={inputStyle}>
            <option value="casual">Casual</option>
            <option value="ranked">Ranked</option>
            <option value="blitz">Blitz</option>
          </select>
          <label htmlFor="maxPlayers">Max players</label>
          <input id="maxPlayers" name="maxPlayers" type="number" min="2" max="6" defaultValue="4" style={inputStyle} />
          <label htmlFor="fastMode" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input id="fastMode" name="fastMode" type="checkbox" /> Fast mode
          </label>
          <button type="submit" style={buttonStyle}>
            {t('lobby.create')}
          </button>
        </form>
        {currentLobby && (
          <div
            style={{
              background: palette.surface,
              padding: '1rem',
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h2 style={{ margin: 0 }}>Current lobby</h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentLobby.players.map((player) => (
                <li key={player.playerId}>
                  {player.displayName} {player.ready ? '✅' : '⌛'}
                  {player.playerId === playerId ? (
                    <button
                      type="button"
                      onClick={() => lobbySocket?.emit('toggle_ready', !player.ready)}
                      style={{ ...buttonStyle, marginLeft: '0.5rem' }}
                    >
                      {player.ready ? t('lobby.notReady') : t('lobby.ready')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {currentLobby.hostId === playerId && (
              <button type="button" onClick={() => lobbySocket?.emit('start_match')} style={buttonStyle}>
                {t('lobby.start')}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  background: palette.primary,
  color: palette.text,
  border: 'none',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  borderRadius: '0.5rem',
  border: '1px solid #475569',
  background: palette.background,
  color: palette.text,
};
