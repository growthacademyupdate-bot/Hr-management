"use client";

import { useMemo, useState } from "react";
import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useDataTable } from "@/hooks/useDataTable";
import { DataTablePagination } from "@/components/DataTablePagination";

export default function ActivityPage() {
  const user = useAuth();
  const db = useDB();

  const myActivities = useMemo(() => {
    if (!user) return [];
    return db.activities
      .filter((a) => (user.role === "employee" ? a.employeeId === (user.employeeId || user.id) : true))
      .map((a) => ({
        ...a,
        formattedTime: new Date(a.time).toISOString(),
      }));
  }, [db.activities, user]);

  const {
    search,
    setSearch,
    sortField,
    sortOrder,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedData,
  } = useDataTable({
    data: myActivities,
    searchFields: (a) => [a.type, a.label, a.module, a.actorRole],
    defaultSortField: "time",
    defaultSortOrder: "desc",
  });

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title="My Activity" 
        description="A complete timeline of your actions and interactions." 
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activity timeline..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => toggleSort("time")}
        >
          Sort by Date {sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="pt-6">
          <ol className="relative border-l border-border ml-3 space-y-8 min-h-[200px]">
            {paginatedData.length === 0 && <div className="text-sm text-muted-foreground">No activity recorded yet.</div>}
            
            {paginatedData.map((a) => (
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

        <DataTablePagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}
