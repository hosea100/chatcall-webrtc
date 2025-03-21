import { LoginForm } from "@/components/login-form"
import { ModeToggle } from "@/components/mode-toggle"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Team Collaboration</h1>
          <p className="mt-2 text-muted-foreground">Connect with your team in real-time</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
