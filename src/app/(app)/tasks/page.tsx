"use client";

import { useState } from "react";
import { useAuth, useDB, api, useGlobalSearch } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { StatusBadge } from "../dashboard/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TasksPage() {
  const user = useAuth();
  const db = useDB();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [viewTask, setViewTask] = useState<any>(null);
  const [editTask, setEditTask] = useState<any>(null);
  const globalSearch = useGlobalSearch().toLowerCase();

  if (!user) return null;

  // Filter tasks based on role
  let visibleTasks = db.tasks;
  if (user.role === "employee") {
    visibleTasks = db.tasks.filter((t) => t.assignedTo === user.employeeId || t.assignedTo === user.id);
  }

  if (globalSearch) {
    visibleTasks = visibleTasks.filter((t) => 
      t.title.toLowerCase().includes(globalSearch) || 
      t.description.toLowerCase().includes(globalSearch) ||
      t.priority.toLowerCase().includes(globalSearch) ||
      t.status.toLowerCase().includes(globalSearch) ||
      db.employees.find((e) => e.id === t.assignedTo)?.name?.toLowerCase().includes(globalSearch)
    );
  }

  // Common overdue check
  const checkOverdue = (task: any) => {
    if (task.status === "completed" || task.status === "reviewed") return false;
    return new Date() > new Date(task.dueDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader title="Tasks" description="Manage and track assignments across the organization." />
        
        {user.role === "admin" && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>Create Task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <CreateTaskForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                {user.role !== "employee" && <TableHead>Employee</TableHead>}
                <TableHead>Priority</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No tasks found.
                  </TableCell>
                </TableRow>
              )}
              {visibleTasks.map((task) => {
                const isOverdue = checkOverdue(task);
                const assignedEmp = db.employees.find((e) => e.id === task.assignedTo);
                
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="font-medium">{task.title}</div>
                    </TableCell>
                    {user.role !== "employee" && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={assignedEmp?.avatar} />
                            <AvatarFallback>{assignedEmp?.name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{assignedEmp?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{task.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div><span className="text-muted-foreground">Assigned:</span> {task.assignDate}</div>
                        <div>
                          <span className="text-muted-foreground">Due:</span>{" "}
                          <span className={isOverdue ? "text-destructive font-semibold" : ""}>{task.dueDate}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 items-start">
                        <StatusBadge status={task.status} />
                        {isOverdue && <Badge variant="destructive" className="text-[10px] h-4">Overdue</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setViewTask(task); setIsViewOpen(true); }}>
                          View
                        </Button>
                        
                        {(user.role === "admin" || user.role === "hr") && (
                          <Button size="sm" variant="outline" onClick={() => { setEditTask(task); setIsEditOpen(true); }}>
                            Edit
                          </Button>
                        )}
                        
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (confirm("Are you sure you want to delete this task?")) {
                            await api.deleteTask(task.id);
                            toast.success("Task deleted");
                          }
                        }}>
                          Delete
                        </Button>
                        
                        {/* Employee Actions */}
                        {user.role === "employee" && task.status === "assigned" && (
                          <Button size="sm" variant="outline" onClick={() => api.updateTaskStatus(task.id, "working_progress")}>
                            Working Progress
                          </Button>
                        )}
                        {user.role === "employee" && task.status === "working_progress" && (
                          <Button size="sm" variant="default" onClick={() => api.updateTaskStatus(task.id, "completed")}>
                            Completed
                          </Button>
                        )}
                        
                        {/* HR Actions */}
                        {(user.role === "hr" || user.role === "admin") && task.status === "completed" && (
                          <Button size="sm" variant="secondary" onClick={() => { setSelectedTask(task); setIsReviewOpen(true); }}>
                            Review Task
                          </Button>
                        )}

                        {/* Display reviews */}
                        {task.status === "reviewed" && task.hrRating && (
                          <div className="text-xs text-muted-foreground flex items-center capitalize">
                            <span className="text-yellow-500 mr-1">★</span> {task.hrRating}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Task Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {viewTask && (
            <div className="space-y-4 pt-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Title</div>
                <div className="text-base font-medium">{viewTask.title}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Description</div>
                <div className="text-sm whitespace-pre-wrap mt-1">{viewTask.description}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Priority</div>
                  <Badge variant="outline" className="capitalize mt-1">{viewTask.priority}</Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="mt-1"><StatusBadge status={viewTask.status} /></div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Assigned Date</div>
                  <div className="text-sm mt-1">{viewTask.assignDate}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Due Date</div>
                  <div className="text-sm mt-1">{viewTask.dueDate}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Task</DialogTitle>
          </DialogHeader>
          <ReviewTaskForm task={selectedTask} onSuccess={() => setIsReviewOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editTask && <EditTaskForm task={editTask} onSuccess={() => setIsEditOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditTaskForm({ task, onSuccess }: { task: any; onSuccess: () => void }) {
  const db = useDB();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [employee, setEmployee] = useState(task.assignedTo);
  const [priority, setPriority] = useState(task.priority);
  const [assignDate, setAssignDate] = useState(task.assignDate);
  const [dueDate, setDueDate] = useState(task.dueDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !employee || !assignDate || !dueDate) {
      toast.error("Please fill all required fields");
      return;
    }
    if (new Date(dueDate) < new Date(assignDate)) {
      toast.error("Due Date cannot be before Assign Date");
      return;
    }
    await api.updateTask(task.id, {
      title,
      description,
      assignedTo: employee,
      priority,
      assignDate,
      dueDate,
    });
    toast.success("Task updated successfully");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Task Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
      </div>
      <div className="space-y-2">
        <Label>Assign To Employee</Label>
        <Select value={employee} onValueChange={setEmployee} required>
          <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
          <SelectContent>
            {db.employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Assign Date</Label>
          <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
      </div>
      <DialogFooter className="pt-4">
        <Button type="submit" className="w-full">Update Task</Button>
      </DialogFooter>
    </form>
  );
}

function CreateTaskForm({ onSuccess }: { onSuccess: () => void }) {
  const db = useDB();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [employee, setEmployee] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !employee || !assignDate || !dueDate) {
      toast.error("Please fill all required fields");
      return;
    }
    if (new Date(dueDate) < new Date(assignDate)) {
      toast.error("Due Date cannot be before Assign Date");
      return;
    }
    await api.addTask({
      title,
      description,
      assignedTo: employee,
      priority,
      assignDate,
      dueDate,
    });
    toast.success("Task assigned successfully");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Task Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
      </div>
      <div className="space-y-2">
        <Label>Assign To Employee</Label>
        <Select value={employee} onValueChange={setEmployee} required>
          <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
          <SelectContent>
            {db.employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Assign Date</Label>
          <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
      </div>
      <DialogFooter className="pt-4">
        <Button type="submit" className="w-full">Assign Task</Button>
      </DialogFooter>
    </form>
  );
}

function ReviewTaskForm({ task, onSuccess }: { task: any; onSuccess: () => void }) {
  const [rating, setRating] = useState("good");
  const [comment, setComment] = useState("");

  if (!task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !comment) {
      toast.error("Please provide both rating and comment");
      return;
    }
    await api.reviewTask(task.id, {
      hrRating: rating,
      hrReview: comment,
    });
    toast.success("Review submitted successfully");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Rating</Label>
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="very good">Very Good</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="average">Average</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Review Comment</Label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Great job on completing this task..." required />
      </div>
      <DialogFooter className="pt-4">
        <Button type="submit" className="w-full">Submit Review</Button>
      </DialogFooter>
    </form>
  );
}
