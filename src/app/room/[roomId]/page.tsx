"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { ChatRoom } from "@/components/chat-room"
import { VideoCall } from "@/components/video-call"
import { UserList } from "@/components/user-list"
import { ModeToggle } from "@/components/mode-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useWebSocket } from "@/hooks/use-websocket"
import { useAuth } from "@/hooks/use-auth"
import { MessageSquare, Video, Users, LogOut } from "lucide-react"

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const { token, user, logout } = useAuth()
  const { messages, sendMessage, roomUsers } = useWebSocket(token)
  const [activeTab, setActiveTab] = useState("chat")

  useEffect(() => {
    if (!token) {
      router.push("/")
    }
  }, [token, router])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (!token || !user) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-foreground">Room: {roomId}</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Logged in as <span className="font-medium text-foreground">{user.name}</span>
            </span>
            <ModeToggle />
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="video">
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="chat" className="h-full">
              <ChatRoom messages={messages} sendMessage={sendMessage} currentUser={user.name} />
            </TabsContent>
            <TabsContent value="video" className="h-full">
              <VideoCall roomId={roomId} username={user.name} />
            </TabsContent>
            <TabsContent value="users" className="h-full">
              <UserList users={roomUsers} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  )
}
