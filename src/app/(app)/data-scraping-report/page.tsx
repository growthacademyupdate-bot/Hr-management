"use client";

import { useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, CalendarIcon, UserIcon, Trash2 } from "lucide-react";
import { useDataTable } from "@/hooks/useDataTable";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DataScrapingReportPage() {
  const user = useAuth();
  const db = useDB();
  const [search, setSearch] = useState("");

  const dataScrapings = db.dataScrapings || [];

  const filteredData = dataScrapings.filter(d => {
    if (!user) return false;
    const matchesSearch = d.businessName.toLowerCase().includes(search.toLowerCase()) || 
                          d.employeeName.toLowerCase().includes(search.toLowerCase()) ||
                          d.state.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  });

  const { 
    paginatedData, 
    page, 
    setPage, 
    pageSize, 
    setPageSize, 
    totalPages, 
    totalItems, 
    startIndex, 
    endIndex 
  } = useDataTable({ 
    data: filteredData, 
    defaultPageSize: 15 
  });

  if (!user || (user.role !== "admin" && user.role !== "hr")) {
    return <div className="p-6">Unauthorized access</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Scraping Report</h1>
        <p className="text-muted-foreground">View all scraped data submitted by employees</p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="py-4 bg-muted/20 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by employee, business or state..." 
                className="pl-9 bg-white" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="whitespace-nowrap w-full">
              <TableHeader className="bg-muted/50 text-xs uppercase tracking-wider">
                <TableRow>
                  <TableHead className="font-semibold text-muted-foreground">Date</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Employee</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Business Name</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">State</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Total Collected</TableHead>
                  {(user.role === "admin" || user.role === "hr") && <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((data) => (
                  <TableRow key={data.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {new Date(data.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">{data.employeeId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center font-medium text-sm">
                        <UserIcon className="mr-1 h-3 w-3 text-muted-foreground" />
                        {data.employeeName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {data.businessName.split(',').map((name, i) => (
                          <div key={i} className="font-semibold text-sm truncate max-w-[300px]">
                            {name.trim()}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-muted-foreground">{data.state}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-sm text-primary">{data.totalDataCollected}</div>
                    </TableCell>
                    {(user.role === "admin" || user.role === "hr") && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8 border-destructive/20 text-destructive hover:bg-destructive/10" onClick={async () => {
                          if(confirm("Are you sure you want to delete this record?")) {
                            try {
                              await api.deleteDataScraping(data.id);
                              toast.success("Record deleted successfully");
                            } catch (e: any) {
                              toast.error(e.message || "Failed to delete");
                            }
                          }
                        }}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {paginatedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="h-8 w-8 mb-2 opacity-20" />
                        <p>No scraping data found matching your criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-border bg-muted/10">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
