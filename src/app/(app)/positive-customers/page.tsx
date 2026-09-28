"use client";

import { useAuth, useDB, api } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PositiveCustomersPage() {
  const user = useAuth();
  const db = useDB();

  if (!user || (user.role === "employee" && user.jobRole !== "Sales")) return <div className="p-6">Unauthorized access</div>;

  const leads = db.leads || [];
  const positiveCustomers = leads.filter(l => {
    const isPositive = l.leadStatus === "POSITIVE";
    const matchesRole = user.role === "admin" || l.employeeId === (user.employeeId || user.id);
    return isPositive && matchesRole;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Positive Customers</h1>
        <p className="text-muted-foreground">List of customers marked as Positive</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  {user.role === "admin" && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {positiveCustomers.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{lead.customerName}</div>
                      <div className="text-xs text-muted-foreground">{lead.company}</div>
                    </TableCell>
                    <TableCell>
                      <div>{lead.mobile}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{lead.leadStatus}</Badge>
                    </TableCell>
                    {user.role === "admin" && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                          if (confirm("Are you sure?")) {
                            await api.deleteLead(lead.id);
                            toast.success("Record deleted");
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {positiveCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={user.role === "admin" ? 4 : 3} className="text-center py-8 text-muted-foreground">No positive customers found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
