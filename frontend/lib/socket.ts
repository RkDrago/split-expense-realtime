"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { transports: ["websocket", "polling"] });
  }
  return socket;
}

export function joinGroupRoom(groupId: string): () => void {
  const s = getSocket();
  s.emit("join", groupId);
  return () => {
    s.emit("leave", groupId);
  };
}
