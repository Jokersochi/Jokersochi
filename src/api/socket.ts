import { io, type Socket } from "socket.io-client";
import { useGameStore } from "@/store/gameStore";
import type { GameState } from "@/types/game";

const SOCKET_URL =
  (import.meta as unknown as { env: { VITE_SOCKET_URL?: string } }).env
    ?.VITE_SOCKET_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true });
  }
  return socket;
}

export function connectSocket(): void {
  getSocket().connect();
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function createRoom(
  roomId: string,
  playerName: string,
): Promise<{
  ok: boolean;
  roomId?: string;
  playerId?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    getSocket().emit("create_room", roomId, playerName, (res: unknown) => {
      resolve(
        res as {
          ok: boolean;
          roomId?: string;
          playerId?: string;
          error?: string;
        },
      );
    });
  });
}

export function joinRoom(
  roomId: string,
  playerName: string,
): Promise<{
  ok: boolean;
  roomId?: string;
  playerId?: string;
  state?: GameState;
  error?: string;
}> {
  return new Promise((resolve) => {
    getSocket().emit("join_room", roomId, playerName, (res: unknown) => {
      resolve(
        res as {
          ok: boolean;
          roomId?: string;
          playerId?: string;
          state?: GameState;
          error?: string;
        },
      );
    });
  });
}

export function subscribeGameState(
  _roomId: string,
  onState?: (state: GameState) => void,
): () => void {
  const s = getSocket();
  const setState = useGameStore.getState().setStateFromServer;

  const handler = (state: GameState): void => {
    setState(state);
    onState?.(state);
  };

  s.on("game_state", handler);

  return (): void => {
    s.off("game_state", handler);
  };
}

export function startGame(roomId: string): void {
  getSocket().emit("start_game", roomId);
}

export function emitRollDice(roomId: string): void {
  getSocket().emit("roll_dice", roomId);
}

export function emitRollFromJail(roomId: string): void {
  getSocket().emit("roll_from_jail", roomId);
}

export function emitBuyProperty(roomId: string, cellIndex: number): void {
  getSocket().emit("buy_property", roomId, cellIndex);
}

export function emitPassBuy(roomId: string): void {
  getSocket().emit("pass_buy", roomId);
}

export function emitPayRent(roomId: string): void {
  getSocket().emit("pay_rent", roomId);
}

export function emitPayTax(roomId: string): void {
  getSocket().emit("pay_tax", roomId);
}

export function emitResolveChanceChest(roomId: string): void {
  getSocket().emit("resolve_chance_chest", roomId);
}

export function emitPayJailFine(roomId: string): void {
  getSocket().emit("pay_jail_fine", roomId);
}

export function emitUseJailCard(roomId: string): void {
  getSocket().emit("use_jail_card", roomId);
}
