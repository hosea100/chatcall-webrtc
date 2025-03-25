"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAppDispatch } from "@/lib/redux/hooks";
import { addMessage } from "@/lib/redux/slices/chatSlice";
import { setRoomUsers } from "@/lib/redux/slices/usersSlice";
import { setIncomingCall, setCallStatus } from "@/lib/redux/slices/videoSlice";
import type { Message } from "@/types/chat";
import type { User } from "@/types/user";
import { toast } from "sonner";
import { baseURL } from "@/config/constants";

// WebRTC signaling message types
type SignalingMessage = {
  type:
    | "offer"
    | "answer"
    | "candidate"
    | "call-request"
    | "call-accepted"
    | "call-rejected"
    | "call-ended";
  sender: string;
  target?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export function useWebSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomUsers, setRoomUsersState] = useState<Record<string, User>>({});
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

    const connectSocket = () => {
      const socketInstance = io(baseURL, {
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        // Add these options to improve connection reliability
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      socketRef.current = socketInstance;
      setSocket(socketInstance);

      // Expose socket globally for signaling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).socket = socketInstance;

      // Socket event listeners
      socketInstance.on("connect", () => {
        console.log("Connected to WebSocket server");
        toast.success("Connected to server");
      });

      socketInstance.on("message", (message: Message) => {
        setMessages((prev) => [...prev, message]);
        dispatch(addMessage(message));
      });

      socketInstance.on("roomUsers", (users: Record<string, User>) => {
        console.log("Received room users update:", users);
        setRoomUsersState(users);
        dispatch(setRoomUsers(users));
      });

      // WebRTC signaling
      socketInstance.on("webrtc-signaling", (message: SignalingMessage) => {
        console.log("Received WebRTC signaling message:", message);

        if (message.type === "call-request") {
          dispatch(setIncomingCall(true));
        } else if (message.type === "call-ended") {
          dispatch(setCallStatus("disconnected"));
        }
      });

      socketInstance.on("disconnect", () => {
        console.log("Disconnected from WebSocket server");
        toast.error("Disconnected from server");
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Connection error:", error);
        toast.error("Connection error", {
          description: "Failed to connect to the server",
        });
      });
    };

    connectSocket();

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // If the tab becomes visible and socket is disconnected, reconnect
        if (socketRef.current && !socketRef.current.connected) {
          console.log("Tab visible, reconnecting socket...");
          socketRef.current.connect();

          // Send a ping to update our status
          setTimeout(() => {
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit("ping");
            }
          }, 500);
        }
      }
    };

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Ping the server periodically to keep the connection alive
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("ping");
      }
    }, 30000); // Every 30 seconds

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      if (reconnectTimeoutRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        clearTimeout(reconnectTimeoutRef.current);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pingInterval);
      socketRef.current = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).socket;
    };
  }, [token, dispatch]);

  // Send message function
  const sendMessage = useCallback(
    (content: string) => {
      if (socketRef.current) {
        const message = { content };
        socketRef.current.emit("message", message);

        // Add the message to local state immediately for the sender
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const newMessage = { name: user.name, content };

        setMessages((prev) => [...prev, newMessage]);
        dispatch(addMessage(newMessage));
      }
    },
    [dispatch]
  );

  // Send WebRTC signaling message
  const sendSignalingMessage = useCallback((message: SignalingMessage) => {
    if (socketRef.current) {
      socketRef.current.emit("webrtc-signaling", message);
      console.log("Sent signaling message:", message);
    }
  }, []);

  return {
    socket,
    messages,
    sendMessage,
    roomUsers,
    sendSignalingMessage,
  };
}
