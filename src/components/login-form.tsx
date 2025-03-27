"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  room: z.string().min(1, {
    message: "Room name is required.",
  }),
});

export function LoginForm() {
  const router = useRouter();
  const { login, status, error: authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      room: "",
    },
  });

  // Effect to handle navigation after successful login
  useEffect(() => {
    if (status === "succeeded" && pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    } else if (status === "failed" && authError) {
      setError(authError);
      setIsLoading(false);
      setPendingNavigation(null);
    }
  }, [status, pendingNavigation, authError, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      // Store the destination URL we want to navigate to
      setPendingNavigation(`/room/${encodeURIComponent(values.room)}`);
      
      // Dispatch login action
      await login(values.name, values.room);
      
      // Don't navigate here - let the useEffect handle it
      // This way we ensure the Redux state is updated first
    } catch (error) {
      console.error("Login failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
      setPendingNavigation(null);
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="room"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter room name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && <div className="text-destructive text-sm">{error}</div>}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Joining..." : "Join Room"}
        </Button>
      </form>
    </Form>
  );
}