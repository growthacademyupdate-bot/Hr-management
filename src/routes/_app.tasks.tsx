import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Paperclip, Trash2, MessageSquare } from "lucide-react";
import { StatusBadge } from "./_app.dashboard";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const user = useAuth();
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const canCreate = user?.role === "admin" || user?.role === "hr";

  const tasks = user?.role === "employee"
    ? db.tasks.filter((t) => t.assignedTo === user.employeeId)
    : db.tasks;

  const activeTask = tasks.find((t) => t.id === active);

  return (
    <div>
      <PageHeader title={user?.role === "employee" ? "My Tasks" : "Tasks"} description={`${tasks.length} tasks`}
        actions={canCreate ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Create Task</Button></DialogTrigger>
            <CreateTaskDialog onClose={() => setOpen(false)} />
          </Dialog>
        ) : null}
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48">Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => {
                  const emp = db.employees.find((e) => e.id === t.assignedTo);
                  return (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => setActive(t.id)}>
                      <TableCell>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">{t.description}</div>
                      </TableCell>
                      <TableCell>
                        {emp && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7"><AvatarImage src={emp.avatar} /><AvatarFallback>{emp.name[0]}</AvatarFallback></Avatar>
                            <span className="text-sm">{emp.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={t.priority} /></TableCell>
                      <TableCell>{t.dueDate}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={t.progress} className="h-2" />
                          <span className="text-xs tabular-nums w-10">{t.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canCreate && (
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); api.deleteTask(t.id); toast.success("Task deleted"); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {tasks.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No tasks yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        {activeTask && <TaskDetailDialog task={activeTask} onClose={() => setActive(null)} />}
      </Dialog>
    </div>
  );
}

function CreateTaskDialog({ onClose }: { onClose: () => void }) {
  const db = useDB();
  const [form, setForm] = useState({
    title: "", description: "", assignedTo: db.employees[0]?.id || "",
    priority: "Medium" as const, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
  function submit() {
    if (!form.title) { toast.error("Title required"); return; }
    api.addTask({ ...form, status: "Pending", progress: 0 });
    toast.success("Task created");
    onClose();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
        <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Assign to</Label>
            <Select value={form.assignedTo} onValueChange={(v) => setForm({...form, assignedTo: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{db.employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v as typeof form.priority})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} /></div>
        <Button variant="outline" className="w-full" type="button"><Paperclip className="h-4 w-4 mr-2" />Attach File</Button>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Create</Button></DialogFooter>
    </DialogContent>
  );
}

function TaskDetailDialog({ task, onClose }: { task: import("@/lib/mock-data").Task; onClose: () => void }) {
  const user = useAuth();
  const [progress, setProgress] = useState(task.progress);
  const [comment, setComment] = useState("");

  function start() { api.updateTask(task.id, { status: "In Progress", progress: Math.max(progress, 10) }); toast.success("Task started"); }
  function save() { api.updateTask(task.id, { progress, status: progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Pending" }); toast.success("Progress saved"); onClose(); }
  function complete() { api.updateTask(task.id, { progress: 100, status: "Completed" }); toast.success("Task completed"); onClose(); }
  function addComment() {
    if (!comment.trim() || !user) return;
    api.addComment(task.id, { author: user.name, text: comment });
    setComment("");
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{task.title}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{task.description}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <StatusBadge status={task.priority} /><StatusBadge status={task.status} />
          <span className="text-muted-foreground">Due: {task.dueDate}</span>
        </div>
        <div className="space-y-2">
          <Label>Progress: {progress}%</Label>
          <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(+e.target.value)} className="w-full accent-[var(--color-primary)]" />
          <Progress value={progress} className="h-2" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comments</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {task.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
            {task.comments.map((c, i) => (
              <div key={i} className="text-sm bg-muted/40 rounded-lg p-2">
                <div className="font-medium">{c.author}</div>
                <div className="text-muted-foreground">{c.text}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button onClick={addComment}>Send</Button>
          </div>
        </div>
      </div>
      <DialogFooter className="gap-2">
        {task.status === "Pending" && <Button variant="outline" onClick={start}>Start Task</Button>}
        <Button variant="outline" onClick={save}>Save Progress</Button>
        <Button onClick={complete}>Mark Completed</Button>
      </DialogFooter>
    </DialogContent>
  );
}
