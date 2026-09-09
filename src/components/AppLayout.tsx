"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, logout, ROLE_MENUS, useGlobalSearch, api, useDB } from "@/lib/store";
import {
  LayoutDashboard, Users, CalendarCheck, ListTodo, CalendarOff, BarChart3, Settings, Activity, User as UserIcon,
  Bell, LogOut, Menu, Search, Sun, CalendarDays, Receipt, X
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, CalendarCheck, ListTodo, CalendarOff, BarChart3, Settings, Activity, User: UserIcon, CalendarDays, Bell, Receipt
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const globalSearch = useGlobalSearch();
  const db = useDB();
  const notifications = db.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const [searchFocused, setSearchFocused] = useState(false);

  // Check maintenance mode on mount
  useEffect(() => {
    async function checkMaintenance() {
      try {
        const response = await fetch('/api/maintenance');
        const data = await response.json();
        setMaintenanceMode(data.maintenanceMode);
        
        // If maintenance mode is active and user is not admin, redirect to maintenance page
        if (data.maintenanceMode && user?.role !== 'admin' && pathname !== '/maintenance') {
          router.push('/maintenance');
        }
      } catch (error) {
        console.error('Failed to check maintenance mode:', error);
      } finally {
        setCheckingMaintenance(false);
      }
    }
    
    if (user) {
      checkMaintenance();
    } else {
      setCheckingMaintenance(false);
    }
  }, [user, router, pathname]);

  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return null;

    const employees = (db.employees || []).filter(e => 
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q) ||
      e.id?.toLowerCase().includes(q)
    ).slice(0, 3);

    const tasks = (db.tasks || []).filter(t => 
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.status?.toLowerCase().includes(q) ||
      t.priority?.toLowerCase().includes(q)
    ).slice(0, 3);

    const attendance = (db.attendance || []).filter(a => {
      const emp = db.employees?.find(e => e.id === a.employeeId);
      return a.date?.toLowerCase().includes(q) ||
        a.status?.toLowerCase().includes(q) ||
        emp?.name?.toLowerCase().includes(q);
    }).slice(0, 3);

    const leaves = (db.leaves || []).filter(l => {
      const emp = db.employees?.find(e => e.id === l.employeeId);
      return l.type?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        l.status?.toLowerCase().includes(q) ||
        emp?.name?.toLowerCase().includes(q);
    }).slice(0, 3);

    const expenses = (db.expenses || []).filter(ex => {
      const emp = db.employees?.find(e => e.id === ex.employeeId);
      return ex.title?.toLowerCase().includes(q) ||
        ex.category?.toLowerCase().includes(q) ||
        ex.status?.toLowerCase().includes(q) ||
        emp?.name?.toLowerCase().includes(q);
    }).slice(0, 3);

    const holidays = (db.holidays || []).filter(h =>
      h.name?.toLowerCase().includes(q) ||
      h.holidayType?.toLowerCase().includes(q) ||
      h.startDate?.toLowerCase().includes(q)
    ).slice(0, 3);

    const totalCount = employees.length + tasks.length + attendance.length + leaves.length + expenses.length + holidays.length;

    return { employees, tasks, attendance, leaves, expenses, holidays, totalCount };
  }, [globalSearch, db]);

  useEffect(() => {
    if (user === null) router.push("/login");
  }, [user, router]);

  // Show loading state while checking maintenance
  if (checkingMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  const menu = ROLE_MENUS[user.role];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchResults) {
      if (searchResults.employees.length > 0) router.push("/employees");
      else if (searchResults.tasks.length > 0) router.push("/tasks");
      else if (searchResults.attendance.length > 0) router.push("/attendance");
      else if (searchResults.leaves.length > 0) router.push("/leaves");
      else if (searchResults.expenses.length > 0) router.push("/expenses");
      else if (searchResults.holidays.length > 0) router.push("/holidays");
      setSearchFocused(false);
    }
  };

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
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <Input 
              placeholder="Search employees, tasks, attendance..." 
              className="pl-9 pr-9 bg-muted/40 border-0" 
              value={globalSearch}
              onChange={(e) => api.setGlobalSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onKeyDown={handleSearchKeyDown}
            />
            {globalSearch && (
              <button 
                onClick={() => api.setGlobalSearch("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Live Search Popup Dropdown */}
            {searchFocused && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto p-2 divide-y divide-border">
                {searchResults.totalCount === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No matches found for &quot;<span className="font-semibold">{globalSearch}</span>&quot;
                  </div>
                ) : (
                  <>
                    {/* Employees */}
                    {searchResults.employees.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Employees ({searchResults.employees.length})</span>
                          <button onClick={() => router.push("/employees")} className="text-primary hover:underline text-[10px]">View All</button>
                        </div>
                        {searchResults.employees.map(e => (
                          <div 
                            key={e.id}
                            onClick={() => { router.push("/employees"); setSearchFocused(false); }}
                            className="px-3 py-2 text-sm hover:bg-muted/60 rounded-lg cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-medium text-foreground">{e.name}</span>
                            <span className="text-xs text-muted-foreground">{e.department} • {e.designation}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tasks */}
                    {searchResults.tasks.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Tasks ({searchResults.tasks.length})</span>
                          <button onClick={() => router.push("/tasks")} className="text-primary hover:underline text-[10px]">View All</button>
                        </div>
                        {searchResults.tasks.map(t => (
                          <div 
                            key={t.id}
                            onClick={() => { router.push("/tasks"); setSearchFocused(false); }}
                            className="px-3 py-2 text-sm hover:bg-muted/60 rounded-lg cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-medium truncate max-w-[200px]">{t.title}</span>
                            <Badge variant="outline" className="capitalize text-[10px]">{t.status.replace("_", " ")}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Attendance */}
                    {searchResults.attendance.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Attendance ({searchResults.attendance.length})</span>
                          <button onClick={() => router.push("/attendance")} className="text-primary hover:underline text-[10px]">View All</button>
                        </div>
                        {searchResults.attendance.map(a => {
                          const emp = db.employees?.find(e => e.id === a.employeeId);
                          return (
                            <div 
                              key={a.id}
                              onClick={() => { router.push("/attendance"); setSearchFocused(false); }}
                              className="px-3 py-2 text-sm hover:bg-muted/60 rounded-lg cursor-pointer flex justify-between items-center"
                            >
                              <span className="font-medium">{emp?.name || "Attendance Record"}</span>
                              <span className="text-xs text-muted-foreground">{a.date} • {a.status}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Leaves */}
                    {searchResults.leaves.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Leaves ({searchResults.leaves.length})</span>
                          <button onClick={() => router.push("/leaves")} className="text-primary hover:underline text-[10px]">View All</button>
                        </div>
                        {searchResults.leaves.map(l => {
                          const emp = db.employees?.find(e => e.id === l.employeeId);
                          return (
                            <div 
                              key={l.id}
                              onClick={() => { router.push("/leaves"); setSearchFocused(false); }}
                              className="px-3 py-2 text-sm hover:bg-muted/60 rounded-lg cursor-pointer flex justify-between items-center"
                            >
                              <span className="font-medium">{emp?.name || l.type}</span>
                              <Badge variant="outline" className="capitalize text-[10px]">{l.status}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Expenses */}
                    {searchResults.expenses.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Expenses ({searchResults.expenses.length})</span>
                          <button onClick={() => router.push("/expenses")} className="text-primary hover:underline text-[10px]">View All</button>
                        </div>
                        {searchResults.expenses.map(ex => (
                          <div 
                            key={ex.id}
                            onClick={() => { router.push("/expenses"); setSearchFocused(false); }}
                            className="px-3 py-2 text-sm hover:bg-muted/60 rounded-lg cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-medium">{ex.title}</span>
                            <span className="text-xs font-semibold text-emerald-600">₹{ex.amount}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Holidays */}
                    {searchResults.holidays.length > 0 && (
                      <div className="py-2">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                          <span>Holidays ({searchResults.holidays.length})</span>
                          <button onClick={() => router.push("/holidays")} className="text-primary hover:underline text-[10px]">View All</button>
                        </div>
                        {searchResults.holidays.map(h => (
                          <div 
                            key={h.id}
                            onClick={() => { router.push("/holidays"); setSearchFocused(false); }}
                            className="px-3 py-2 text-sm hover:bg-muted/60 rounded-lg cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-medium">{h.name}</span>
                            <span className="text-xs text-muted-foreground">{h.startDate}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
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
