"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone } from "lucide-react";
import type { User } from "@/types/user";

interface UserListProps {
  users: Record<string, User>;
  currentUsername: string;
  onCallUser: (username: string) => void;
}

export function CallUserList({
  users,
  currentUsername,
  onCallUser,
}: UserListProps) {
  // Get online users excluding self
  const onlineUsers = Object.entries(users)
    .filter(([name, data]) => data.online && name !== currentUsername)
    .map(([name]) => name);

  return (
    <Card className="p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Start a Video Call</h2>
      <p className="text-muted-foreground mb-6">
        Select a user to start a video call with:
      </p>

      <div className="flex-1 overflow-auto">
        {onlineUsers.length > 0 ? (
          <div className="space-y-3">
            {onlineUsers.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{name}</span>
                </div>
                <Button
                  onClick={() => onCallUser(name)}
                  size="sm"
                  className="gap-1"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              No online users available to call
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
