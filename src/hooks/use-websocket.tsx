"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { Message } from "@/types/chat";
import type { User } from "@/types/user";

export function useWebSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomUsers, setRoomUsers] = useState<Record<string, User>>({});
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

    const socketInstance = io("https://mfkwnj6b-4000.asse.devtunnels.ms/", {
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // Socket event listeners
    socketInstance.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socketInstance.on("message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketInstance.on("roomUsers", (users: Record<string, User>) => {
      setRoomUsers(users);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // Send message function
  const sendMessage = useCallback((content: string) => {
    if (socketRef.current) {
      const message = { content };
      socketRef.current.emit("message", message);

      // Add the message to local state immediately for the sender
      // We need to get the user's name from the JWT token or context
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setMessages((prev) => [...prev, { name: user.name, content }]);
    }
  }, []);

  return { socket, messages, sendMessage, roomUsers };
}
