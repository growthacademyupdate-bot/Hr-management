import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { login, useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Shield, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const user = useAuth();
  if (user) {
    setTimeout(() => navigate({ to: "/dashboard" }), 0);
  }

  const [tab, setTab] = useState<"admin" | "hr" | "employee">("admin");
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  function fill(role: "admin" | "hr" | "employee") {
    if (role === "admin") { setU("admin"); setP("admin123"); }
    if (role === "hr") { setU("hr"); setP("hr123"); }
    if (role === "employee") { setU("employee@example.com"); setP("emp123"); }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const usr = login(u, p);
    if (!usr) { toast.error("Invalid credentials"); return; }
    toast.success(`Welcome, ${usr.name}`);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2 bg-background">
      <Toaster richColors />
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 grid place-items-center backdrop-blur"><Activity className="h-5 w-5" /></div>
          <span className="font-bold text-xl tracking-tight">WorkMonitor</span>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="text-4xl font-bold tracking-tight leading-tight">The complete employee productivity platform.</h2>
          <p className="text-white/80">Track attendance, manage tasks, monitor activity, and gain insights — all from one elegant dashboard.</p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[{ i: Users, l: "Employees" }, { i: BarChart3, l: "Analytics" }, { i: Shield, l: "Secure" }].map(({ i: I, l }) => (
              <div key={l} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <I className="h-5 w-5 mb-2" /><div className="text-sm font-medium">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/60">© 2026 WorkMonitor. Demo build.</div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl grid place-items-center text-white" style={{ background: "var(--gradient-primary)" }}><Activity className="h-5 w-5" /></div>
            <span className="font-bold text-xl">WorkMonitor</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground mt-2">Choose your role to continue.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-8">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="hr">HR</TabsTrigger>
              <TabsTrigger value="employee">Employee</TabsTrigger>
            </TabsList>
            {(["admin", "hr", "employee"] as const).map((r) => (
              <TabsContent key={r} value={r}>
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0 pt-6">
                    <form onSubmit={onSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>{r === "employee" ? "Email" : "Username"}</Label>
                        <Input value={u} onChange={(e) => setU(e.target.value)} placeholder={r === "employee" ? "employee@example.com" : r} autoComplete="username" />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" />
                      </div>
                      <Button type="submit" className="w-full h-11">Sign in as {r}</Button>
                      <Button type="button" variant="outline" className="w-full" onClick={() => fill(r)}>Use demo credentials</Button>
                    </form>
                    <div className="mt-6 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                      <div><span className="font-semibold">Admin:</span> admin / admin123</div>
                      <div><span className="font-semibold">HR:</span> hr / hr123</div>
                      <div><span className="font-semibold">Employee:</span> employee@example.com / emp123</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
