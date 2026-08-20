"use client";

import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ActivityPage() {
  const user = useAuth();
  const db = useDB();

  if (!user) return null;

  // For an employee, show only their activities. For HR/Admin, they shouldn't normally be on this page, but we'll safeguard it.
  const myActivities = db.activities
    .filter(a => user.role === "employee" ? a.employeeId === (user.employeeId || user.id) : true)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title="My Activity" 
        description="A complete timeline of your actions and interactions." 
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <ol className="relative border-l border-border ml-3 space-y-8">
            {myActivities.length === 0 && <div className="text-sm text-muted-foreground">No activity recorded yet.</div>}
            
            {myActivities.map((a) => (
              <li key={a.id} className="ml-6">
                <div className="absolute -left-2 h-4 w-4 rounded-full bg-primary mt-1.5 ring-4 ring-background" />
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-1">
                  <time className="text-sm font-semibold text-muted-foreground">
                    {new Date(a.time).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at {new Date(a.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                  {a.module && (
                    <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">
                      {a.module}
                    </Badge>
                  )}
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4 mt-2 border">
                  <h4 className="text-base font-semibold mb-1">{a.type.replace(/_/g, " ")}</h4>
                  <p className="text-sm text-foreground/90">{a.label}</p>
                  
                  {a.actorRole && a.actorRole !== "employee" && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="font-medium">Performed By:</span> 
                      <span className="capitalize">{a.actorRole}</span>
                    </div>
                  )}
                  
                  {a.metadata && Object.keys(a.metadata).length > 0 && (
                    <div className="mt-3 bg-background/50 rounded p-2 text-xs text-muted-foreground">
                      {Object.entries(a.metadata).map(([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-semibold capitalize">{key}:</span>
                          <span>{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
