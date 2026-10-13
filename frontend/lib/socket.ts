"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });
  }
  return socket;
}

export function joinGroupRoom(groupId: string): () => void {
  const s = getSocket();
  if (s.connected) s.emit("join", groupId);
  else s.once("connect", () => s.emit("join", groupId));
  return () => {
    s.emit("leave", groupId);
  };
}
