import { sanitizeChatMessage } from "./security";

export type ChatMessage = {
  id: string;
  room: string;
  from: string;
  text: string;
  at: number;
  holding: number;
};


const KEY = "percorium-chat-v1";

function seed(room: string): ChatMessage[] {
  return [
    {
      id: `${room}-s1`,
      room,
      from: "0x4c11…a91e",
      text: "Oracle is the risk price. AMM print is just basis.",
      at: Date.now() - 1000 * 60 * 42,
      holding: 12,
    },
    {
      id: `${room}-s2`,
      room,
      from: "0x9b20…c2e3",
      text: "Anyone supplying this into Morpho yet, or still waiting on a market?",
      at: Date.now() - 1000 * 60 * 18,
      holding: 3.4,
    },
  ];
}

type Store = Record<string, ChatMessage[]>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function listMessages(room: string): ChatMessage[] {
  const store = read();
  if (!store[room]) {
    store[room] = seed(room);
    write(store);
  }
  return store[room] ?? [];
}

export function postMessage(input: {
  room: string;
  from: string;
  text: string;
  holding: number;
}): ChatMessage | { error: string } {
  const text = sanitizeChatMessage(input.text);
  if (!text) return { error: "Empty or invalid message" };
  if (input.holding <= 0) return { error: "Holders only" };
  const store = read();
  const list = store[input.room] ?? seed(input.room);
  const msg: ChatMessage = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    room: input.room.slice(0, 32),
    from: input.from.slice(0, 42),
    text,
    at: Date.now(),
    holding: input.holding,
  };
  store[input.room] = [...list, msg].slice(-200);
  write(store);
  return msg;
}

