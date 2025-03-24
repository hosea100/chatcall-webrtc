"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAppDispatch } from "@/lib/redux/hooks";
import { addMessage } from "@/lib/redux/slices/chatSlice";
import { setRoomUsers } from "@/lib/redux/slices/usersSlice";
import { setIncomingCall, setCallStatus } from "@/lib/redux/slices/videoSlice";
import type { Message } from "@/types/chat";
import type { User } from "@/types/user";

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

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

    const socketInstance = io("http://localhost:4000", {
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
      dispatch(addMessage(message));
    });

    socketInstance.on("roomUsers", (users: Record<string, User>) => {
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

      // The actual handling of offers, answers, and candidates will be in the VideoCall component
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
