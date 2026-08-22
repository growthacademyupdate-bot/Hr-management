"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, logout, ROLE_MENUS, useGlobalSearch, api, useDB } from "@/lib/store";
import {
  LayoutDashboard, Users, CalendarCheck, ListTodo, CalendarOff, BarChart3, Settings, Activity, User as UserIcon,
  Bell, LogOut, Menu, Search, Sun, CalendarDays
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, CalendarCheck, ListTodo, CalendarOff, BarChart3, Settings, Activity, User: UserIcon, CalendarDays, Bell
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const globalSearch = useGlobalSearch();
  const db = useDB();
  const notifications = db.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (user === null) router.push("/login");
  }, [user, router]);

  if (!user) return null;
  const menu = ROLE_MENUS[user.role];

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col`}>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary grid place-items-center text-sidebar-primary-foreground font-bold">W</div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight">WorkMonitor</div>
            <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">{user.role}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menu.map((m) => {
            const Icon = ICONS[m.icon] || LayoutDashboard;
            const active = pathname === m.to || (m.to !== "/dashboard" && pathname?.startsWith(m.to));
            return (
              <Link
                key={m.to}
                href={m.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { logout(); router.push("/"); }} 
              title="Log out" 
              className="text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-card/95 backdrop-blur border-b flex items-center gap-4 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* 1. User Profile First */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg pl-1 pr-3 py-1 hover:bg-muted transition cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                <UserIcon className="h-4 w-4 mr-2" />Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); router.push("/"); }} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2. Search Bar Second */}
          <div className="relative hidden md:block flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search employees, tasks…" 
              className="pl-9 bg-muted/40 border-0" 
              value={globalSearch}
              onChange={(e) => api.setGlobalSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 md:hidden" />

          {/* 3. Notifications & Controls Right */}
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 grid place-items-center bg-primary text-primary-foreground">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-2 py-1">
                  <DropdownMenuLabel className="font-bold">Notifications</DropdownMenuLabel>
                  <Link href="/notifications" className="text-xs text-primary hover:underline font-medium">View All</Link>
                </div>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">No notifications</div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <DropdownMenuItem 
                      key={n.id} 
                      onClick={() => {
                        api.markNotificationAsRead(n.id);
                        if (n.actionUrl) router.push(n.actionUrl);
                      }}
                      className={`py-3 cursor-pointer hover:bg-muted/80 transition-colors ${!n.isRead ? "bg-muted/30" : ""}`}
                    >
                      <div className="space-y-1 relative w-full pr-4">
                        {!n.isRead && <div className="absolute top-1 right-0 h-2 w-2 rounded-full bg-primary" />}
                        <div className="text-sm font-semibold leading-tight">{n.title}</div>
                        <div className="text-xs text-muted-foreground">{n.message}</div>
                        <div className="text-[10px] text-primary font-medium">
                          {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon"><Sun className="h-5 w-5" /></Button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
