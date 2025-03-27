"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types/user";

type UserListProps = {
  users: Record<string, User>;
};

export function UserList({ users }: UserListProps) {
  const userArray = Object.entries(users).map(([name, data]) => ({
    ...data,
    name,
  }));

  return (
    <Card className="p-4 h-full">
      <h2 className="text-xl font-bold mb-4">Users in Room</h2>
      <ScrollArea className="h-[calc(100%-2rem)]">
        <div className="space-y-2">
          {userArray.length > 0 ? (
            userArray.map((user) => (
              <div
                key={user.name}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                        user.online ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <span className="font-medium">{user.name}</span>
                </div>
                <Badge variant={user.online ? "default" : "outline"}>
                  {user.online ? "Online" : "Offline"}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No users in this room yet
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
