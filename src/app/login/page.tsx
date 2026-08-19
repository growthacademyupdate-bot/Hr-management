'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Shield, Users, BarChart3, BriefcaseBusiness, UserCog, UserRound, ArrowUpRight, Check, CalendarCheck2, ClipboardCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

import { loginAction } from "@/app/actions";

export default function LoginPage() {
  const router = useRouter();
  const user = useAuth();
  
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const [tab, setTab] = useState<"admin" | "hr" | "employee">("admin");
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  function fill(role: "admin" | "hr" | "employee") {
    if (role === "admin") { setU("admin@gmail.com"); setP("admin123"); }
    if (role === "hr") { setU("hr@gmail.com"); setP("hr@123"); }
    if (role === "employee") { setU("almawainternational2027@gmail.com"); setP("tushar123"); }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Call the real backend authentication
    const res = await loginAction(u, p);
    if (!res.success || !res.user) { 
      toast.error(res.error || "Invalid credentials"); 
      return; 
    }
    
    // Set local session
    localStorage.setItem("ems_auth_v1", JSON.stringify(res.user));
    window.dispatchEvent(new Event("ems_auth_change"));
    
    toast.success(`Welcome, ${res.user.name}`);
    router.push("/dashboard");
  }

  const roles = [
    { value: "admin", label: "Admin", icon: UserCog },
    { value: "hr", label: "HR team", icon: BriefcaseBusiness },
    { value: "employee", label: "Employee", icon: UserRound },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-[#14231f] min-[900px]:grid min-[900px]:grid-cols-[minmax(420px,0.95fr)_minmax(480px,1.05fr)]">
      <Toaster richColors />
      <div className="order-2 flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 min-[900px]:col-start-2 min-[900px]:px-14 xl:px-20">
        <div className="w-full max-w-[420px] animate-in">
          <div className="mb-12 flex items-center gap-3 min-[900px]:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#14231f] text-[#d8f56c]"><Activity className="h-5 w-5" /></div>
            <span className="text-xl font-bold tracking-tight">WorkMonitor</span>
          </div>
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#71817b]">Workspace access</p>
            <h1 className="text-4xl font-bold tracking-[-0.04em] text-[#14231f]">Welcome back.</h1>
            <p className="mt-3 text-sm leading-6 text-[#71817b]">Choose your role to enter your people operations workspace.</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-2xl bg-[#e8ede8] p-1">
              {roles.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="h-14 gap-2 rounded-xl text-xs font-semibold text-[#71817b] data-[state=active]:bg-white data-[state=active]:text-[#14231f] data-[state=active]:shadow-[0_3px_12px_rgba(20,35,31,0.08)]"><Icon className="h-4 w-4" />{label}</TabsTrigger>
              ))}
            </TabsList>
            {(["admin", "hr", "employee"] as const).map((r) => (
              <TabsContent key={r} value={r} className="mt-7">
                <Card className="border border-[#e0e7e1] bg-white/80 shadow-[0_18px_50px_rgba(20,35,31,0.07)]">
                  <CardContent className="p-6 sm:p-7">
                    <form onSubmit={onSubmit} className="space-y-5">
                      <div className="space-y-2"><Label className="text-xs font-bold text-[#40534b]">{r === "employee" ? "Email address" : "Username"}</Label><Input className="h-12 rounded-xl border-[#dce5de] bg-[#fbfcfa] px-4 shadow-none focus-visible:ring-[#a8c84a]" value={u} onChange={(e) => setU(e.target.value)} placeholder={r === "employee" ? "employee@example.com" : r} autoComplete="username" /></div>
                      <div className="space-y-2"><Label className="text-xs font-bold text-[#40534b]">Password</Label><Input className="h-12 rounded-xl border-[#dce5de] bg-[#fbfcfa] px-4 shadow-none focus-visible:ring-[#a8c84a]" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></div>
                      <div className="flex flex-col gap-3 pt-2 sm:flex-row"><Button type="submit" className="h-12 w-full rounded-xl bg-[#14231f] font-bold text-[#d8f56c] shadow-[0_8px_20px_rgba(20,35,31,0.16)] hover:bg-[#243b33]">Sign in as {r}</Button><Button type="button" variant="outline" className="h-12 w-full rounded-xl border-[#dce5de] bg-white font-semibold text-[#40534b] hover:bg-[#f5f7f4]" onClick={() => fill(r)}>Use demo login</Button></div>
                    </form>
                    <div className="mt-6 border-t border-[#edf1ed] pt-5 text-xs leading-6 text-[#71817b]"><span className="font-bold text-[#40534b]">Demo access</span><br />Admin: admin@gmail.com / admin123<br />HR: hr@gmail.com / hr@123<br />Employee: almawainternational2027@gmail.com / tushar123</div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      <div className="order-1 relative hidden min-h-screen overflow-hidden bg-[#14231f] p-10 text-white min-[900px]:col-start-1 min-[900px]:flex min-[900px]:items-center xl:p-16">
        <div className="relative z-10 mx-auto w-full max-w-xl">
          <div className="mb-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d8f56c] text-[#14231f]"><Activity className="h-5 w-5" /></div><span className="text-xl font-bold tracking-tight">WorkMonitor</span></div>
          <div className="hr-dashboard relative mb-8 max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Today at a glance</p><p className="mt-1 text-sm font-semibold">Workforce pulse</p></div><span className="flex items-center gap-2 rounded-full bg-[#d8f56c]/15 px-2.5 py-1 text-[10px] font-bold text-[#d8f56c]"><span className="hr-pulse h-1.5 w-1.5 rounded-full bg-[#d8f56c]" /> Live</span></div>
            <div className="grid grid-cols-3 gap-2">{[{ icon: CalendarCheck2, value: "92%", label: "Present", tone: "text-[#d8f56c]" }, { icon: ClipboardCheck, value: "38", label: "Tasks done", tone: "text-[#a9d8ff]" }, { icon: TrendingUp, value: "+18%", label: "Momentum", tone: "text-[#ffcf82]" }].map(({ icon: Icon, value, label, tone }) => <div key={label} className="rounded-2xl bg-black/10 p-3"><Icon className={`mb-3 h-4 w-4 ${tone}`} /><p className="text-lg font-bold tracking-tight">{value}</p><p className="mt-0.5 text-[10px] text-white/45">{label}</p></div>)}</div>
            <div className="mt-4 flex items-end gap-1.5 border-t border-white/10 pt-4">{[35, 47, 42, 59, 53, 72, 67, 83, 78, 94].map((height, index) => <span key={index} className="hr-bar flex-1 rounded-t bg-[#d8f56c]/75" style={{ height: `${height / 2}px`, animationDelay: `${index * 80}ms` }} />)}<span className="ml-2 text-[10px] text-white/40">09:00 - now</span></div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d8f56c]"><span className="h-2 w-2 rounded-full bg-[#d8f56c]" /> People ops, made visible</div>
          <h2 className="max-w-lg text-5xl font-bold leading-[1.04] tracking-[-0.05em] xl:text-6xl">Make work feel more <span className="text-[#d8f56c]">human.</span></h2>
          <p className="max-w-md text-base leading-7 text-white/65">A calmer way to understand attendance, tasks, and team momentum without losing sight of the people behind the numbers.</p>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">{[{ i: Users, l: "People" }, { i: BarChart3, l: "Insights" }, { i: Shield, l: "Trusted" }].map(({ i: Icon, l }) => <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><Icon className="mb-5 h-5 w-5 text-[#d8f56c]" /><div className="text-sm font-semibold">{l}</div><Check className="mt-3 h-3.5 w-3.5 text-white/35" /></div>)}</div>
          <div className="mt-10 flex items-center justify-between text-xs text-white/40"><span>© 2026 WorkMonitor</span><ArrowUpRight className="h-4 w-4" /></div>
        </div>
        <div className="absolute -bottom-36 -left-24 h-[28rem] w-[28rem] rounded-full border-[70px] border-[#d8f56c]/10" /><div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#416d60]/35 blur-3xl" />
      </div>
    </div>
  );
}
