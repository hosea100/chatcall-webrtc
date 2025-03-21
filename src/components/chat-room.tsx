"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Send } from "lucide-react"
import type { Message } from "@/types/chat"

const formSchema = z.object({
  message: z.string().min(1),
})

type ChatRoomProps = {
  messages: Message[]
  sendMessage: (content: string) => void
  currentUser: string
}

export function ChatRoom({ messages, sendMessage, currentUser }: ChatRoomProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    sendMessage(values.message)
    form.reset()
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 p-4 mb-4 overflow-hidden">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.name === currentUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.name === currentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {message.name !== currentUser && <div className="font-semibold text-sm mb-1">{message.name}</div>}
                  <div className="break-words">{message.content}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
        <Input placeholder="Type your message..." {...form.register("message")} className="flex-1" />
        <Button type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
