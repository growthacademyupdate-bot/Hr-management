"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";

export function HolidayTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    "COMPANY_HOLIDAY": "bg-success/15 text-success border-success/20",
    "OPTIONAL_HOLIDAY": "bg-info/15 text-info border-info/20",
    "RESTRICTED_HOLIDAY": "bg-warning/15 text-warning border-warning/20",
    "CUSTOM_HOLIDAY": "bg-muted text-muted-foreground border-border",
  };
  const labelMap: Record<string, string> = {
    "COMPANY_HOLIDAY": "Company Holiday",
    "OPTIONAL_HOLIDAY": "Optional Holiday",
    "RESTRICTED_HOLIDAY": "Restricted Holiday",
    "CUSTOM_HOLIDAY": "Custom Holiday",
  };
  return <Badge variant="outline" className={map[type] || ""}>{labelMap[type] || type}</Badge>;
}

export default function HolidaysPage() {
  const user = useAuth();
  const db = useDB();
  const globalSearch = useGlobalSearch();

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);

  const getDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const holidaysWithMeta = useMemo(() => {
    return (db.holidays || []).map((h) => ({
      ...h,
      totalDays: getDays(h.startDate, h.endDate),
    }));
  }, [db.holidays]);

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
    data: holidaysWithMeta,
    searchFields: (h) => [h.name, h.holidayType, h.description, h.startDate, h.endDate],
    defaultSortField: "startDate",
    defaultSortOrder: "asc",
  });

  useEffect(() => {
    setSearch(globalSearch);
  }, [globalSearch, setSearch]);

  if (!user) return null;
  const isAdmin = user.role === "admin";

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this holiday? It may affect leave and attendance reports.")) {
      try {
        await api.deleteHoliday(id);
        toast.success("Holiday deleted successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete holiday");
      }
    }
  };

  const handleToggleStatus = async (holiday: any) => {
    try {
      await api.updateHoliday(holiday.id, { isActive: !holiday.isActive });
      toast.success(`Holiday ${holiday.isActive ? "deactivated" : "activated"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const isMultiDay = (start: string, end: string) => start !== end;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader title="Holiday Calendar" description="View and manage company holidays." />
        
        {isAdmin && (
          <Dialog open={isApplyOpen} onOpenChange={(v) => { setIsApplyOpen(v); if(!v) setEditingHoliday(null); }}>
            <DialogTrigger asChild>
              <Button>Add Holiday</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingHoliday ? "Edit Holiday" : "Create Holiday"}</DialogTitle>
              </DialogHeader>
              <HolidayForm 
                initialData={editingHoliday} 
                onSuccess={() => { setIsApplyOpen(false); setEditingHoliday(null); }} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search holidays..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                api.setGlobalSearch(e.target.value);
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                  Holiday Name
                </SortableHeader>
                <SortableHeader field="holidayType" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                  Type
                </SortableHeader>
                <SortableHeader field="startDate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                  Date(s)
                </SortableHeader>
                <SortableHeader field="totalDays" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                  Total Days
                </SortableHeader>
                <SortableHeader field="isActive" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                  Status
                </SortableHeader>
                {isAdmin && <TableHead className="w-[200px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No holidays found.
                  </TableCell>
                </TableRow>
              )}
              {paginatedData.map((holiday) => {
                const days = holiday.totalDays;
                return (
                  <TableRow key={holiday.id} className={!holiday.isActive ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="font-medium">{holiday.name}</div>
                      {holiday.description && <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={holiday.description}>{holiday.description}</div>}
                    </TableCell>
                    <TableCell>
                      <HolidayTypeBadge type={holiday.holidayType} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm whitespace-nowrap">
                        {isMultiDay(holiday.startDate, holiday.endDate) ? (
                          <><div><span className="text-muted-foreground">From:</span> {holiday.startDate}</div>
                          <div><span className="text-muted-foreground">To:</span> {holiday.endDate}</div></>
                        ) : (
                          <div>{holiday.startDate}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{days} Day{days > 1 ? "s" : ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={holiday.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                        {holiday.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={holiday.isActive} 
                            onCheckedChange={() => handleToggleStatus(holiday)} 
                            title={holiday.isActive ? "Deactivate" : "Activate"}
                          />
                          <Button size="sm" variant="outline" onClick={() => { setEditingHoliday(holiday); setIsApplyOpen(true); }}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(holiday.id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

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
    </div>
  );
}

function HolidayForm({ initialData, onSuccess }: { initialData: any, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      holidayType: formData.get("holidayType") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      isActive: formData.get("isActive") === "on",
    };

    if (!data.endDate) data.endDate = data.startDate;
    
    if (new Date(data.endDate) < new Date(data.startDate)) {
      toast.error("End date cannot be before start date");
      setLoading(false);
      return;
    }

    try {
      if (initialData?.id) {
        await api.updateHoliday(initialData.id, data);
        toast.success("Holiday updated successfully");
      } else {
        await api.createHoliday(data);
        toast.success("Holiday created successfully");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save holiday");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="name">Holiday Name</Label>
        <Input id="name" name="name" required defaultValue={initialData?.name} placeholder="e.g., Diwali Festival Break" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="holidayType">Holiday Type</Label>
        <Select name="holidayType" defaultValue={initialData?.holidayType || "COMPANY_HOLIDAY"} required>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="COMPANY_HOLIDAY">Company Holiday</SelectItem>
            <SelectItem value="OPTIONAL_HOLIDAY">Optional Holiday</SelectItem>
            <SelectItem value="RESTRICTED_HOLIDAY">Restricted Holiday</SelectItem>
            <SelectItem value="CUSTOM_HOLIDAY">Custom Holiday</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" name="startDate" type="date" required defaultValue={initialData?.startDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" name="endDate" type="date" required defaultValue={initialData?.endDate} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea id="description" name="description" placeholder="Additional details..." defaultValue={initialData?.description} />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="isActive" name="isActive" defaultChecked={initialData ? initialData.isActive : true} />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <DialogFooter className="pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Holiday"}
        </Button>
      </DialogFooter>
    </form>
  );
}
