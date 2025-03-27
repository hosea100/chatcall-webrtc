"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, ArrowDown } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { setIsAtBottom } from "@/lib/redux/slices/chatSlice";
import type { Message } from "@/types/chat";

const formSchema = z.object({
  message: z.string().min(1),
});

type ChatRoomProps = {
  messages: Message[];
  sendMessage: (content: string) => void;
  currentUser: string;
};

export function ChatRoom({
  messages,
  sendMessage,
  currentUser,
}: ChatRoomProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const dispatch = useAppDispatch();
  const isAtBottom = useAppSelector((state) => state.chat.isAtBottom);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    sendMessage(values.message);
    form.reset();
  };

  // Check if scroll is at bottom
  const checkScrollPosition = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const isBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;

      dispatch(setIsAtBottom(isBottom));
      setShowScrollButton(!isBottom);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      setShowScrollButton(false);
      dispatch(setIsAtBottom(true));
    }
  };

  // Auto-scroll to bottom when new messages arrive if already at bottom
  useEffect(() => {
    if (isAtBottom && scrollAreaRef.current) {
      scrollToBottom();
    } else if (!isAtBottom) {
      setShowScrollButton(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isAtBottom]);

  // Add scroll event listener
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener("scroll", checkScrollPosition);
      return () =>
        scrollArea.removeEventListener("scroll", checkScrollPosition);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      <Card className="flex-1 p-4 mb-4 overflow-hidden">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.name === currentUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.name === currentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.name !== currentUser && (
                    <div className="font-semibold text-sm mb-1">
                      {message.name}
                    </div>
                  )}
                  <div className="break-words whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-16 right-4 rounded-full shadow-md"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
        <Input
          placeholder="Type your message..."
          {...form.register("message")}
          className="flex-1"
        />
        <Button type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
