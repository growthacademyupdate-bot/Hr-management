"use client";

import { useAuth, useDB, api } from "@/lib/store";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Clock, ExternalLink, Send, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSentBroadcasts } from "@/app/actions";

function PageHeader({ title, description, children }: any) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6 mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

export default function NotificationsPage() {
  const user = useAuth();
  const db = useDB();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread" | "manage">("all");
  
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: "", message: "", referenceId: "" });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [sentBroadcasts, setSentBroadcasts] = useState<any[]>([]);

  // Fetch sent broadcasts when filter is 'manage'
  useState(() => {
    if (!user) return;
    if (user.role === "admin" || user.role === "hr") {
      getSentBroadcasts(user.employeeId || user.id).then(setSentBroadcasts).catch(console.error);
    }
  });

  if (!user) return null;

  const notifications = db.notifications || [];
  const filtered = notifications.filter(n => filter === "all" || !n.isRead);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAll = () => {
    api.markAllNotificationsAsRead();
  };

  const handleNotificationClick = (n: any) => {
    api.markNotificationAsRead(n.id);
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.message) return;
    setIsBroadcasting(true);
    if (broadcastForm.referenceId) {
      await api.editBroadcastNotification(broadcastForm.referenceId, broadcastForm);
    } else {
      await api.broadcastNotification(broadcastForm);
    }
    const updated = await getSentBroadcasts(user.employeeId || user.id);
    setSentBroadcasts(updated);
    setIsBroadcasting(false);
    setBroadcastOpen(false);
    setBroadcastForm({ title: "", message: "", referenceId: "" });
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm("Are you sure you want to delete this broadcast?")) return;
    await api.deleteBroadcastNotification(broadcastId);
    const updated = await getSentBroadcasts(user.employeeId || user.id);
    setSentBroadcasts(updated);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Notification Center" description="View and manage your alerts and updates.">
        {(user.role === "admin" || user.role === "hr") && (
          <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2 mr-2">
                <Send className="h-4 w-4" />
                Send Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{broadcastForm.referenceId ? "Edit Broadcast" : "Send Broadcast Notification"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="e.g. Server Maintenance" value={broadcastForm.title} onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea placeholder="Enter your message..." value={broadcastForm.message} onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
                <Button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastForm.title || !broadcastForm.message}>
                  {broadcastForm.referenceId ? "Save Changes" : "Send to All"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Button variant="outline" onClick={handleMarkAll} disabled={unreadCount === 0 || filter === "manage"} className="gap-2">
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </Button>
      </PageHeader>

      <div className="flex gap-2 mb-6">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className="rounded-full px-6">
          All
        </Button>
        <Button variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")} className="rounded-full px-6 gap-2">
          Unread
          {unreadCount > 0 && <Badge variant="secondary" className="ml-1 rounded-full px-1.5">{unreadCount}</Badge>}
        </Button>
        {(user.role === "admin" || user.role === "hr") && (
          <Button variant={filter === "manage" ? "default" : "outline"} onClick={() => setFilter("manage")} className="rounded-full px-6">
            Manage Broadcasts
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filter === "manage" ? (
              sentBroadcasts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                  <Send className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p>You haven't sent any broadcasts yet.</p>
                </div>
              ) : (
                sentBroadcasts.map((b) => (
                  <div key={b.referenceId} className="p-4 flex gap-4 transition-colors hover:bg-muted/50">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-foreground">{b.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <p className="text-sm text-foreground/90">{b.message}</p>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <Badge variant="outline" className="text-[10px] uppercase">{b.module}</Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-auto p-1 text-xs gap-1 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setBroadcastForm({ title: b.title, message: b.message, referenceId: b.referenceId });
                            setBroadcastOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-auto p-1 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteBroadcast(b.referenceId)}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>No {filter === "unread" ? "unread " : ""}notifications found.</p>
              </div>
            ) : (
              filtered.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 flex gap-4 transition-colors hover:bg-muted/50 ${!n.isRead ? "bg-muted/20" : ""}`}
                >
                  <div className="shrink-0 pt-1">
                    <div className={`h-2 w-2 rounded-full mt-1.5 ${!n.isRead ? "bg-primary" : "bg-transparent"}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className={`font-semibold ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <p className={`text-sm ${!n.isRead ? "text-foreground/90" : "text-muted-foreground"}`}>{n.message}</p>
                    
                    <div className="flex items-center gap-3 pt-2">
                      <Badge variant="outline" className="text-[10px] uppercase">{n.module}</Badge>
                      {n.actionUrl && (
                        <Button 
                          variant="link" 
                          className="h-auto p-0 text-xs gap-1"
                          onClick={() => handleNotificationClick(n)}
                        >
                          View Details <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      {n.isRead && (
                        <span className="text-xs text-muted-foreground">Read</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
