"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth, useDB, api, useGlobalSearch } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { 
  Search, Calendar as CalendarIcon, CalendarDays, List, ChevronLeft, ChevronRight, 
  Plus, BellRing, Sparkles, Clock, CheckCircle2, Info, AlertTriangle, Building2,
  CalendarCheck, Gift
} from "lucide-react";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, parseISO, isAfter, isBefore, differenceInDays
} from "date-fns";

export function HolidayTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    "COMPANY_HOLIDAY": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    "OPTIONAL_HOLIDAY": "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
    "RESTRICTED_HOLIDAY": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    "CUSTOM_HOLIDAY": "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  };
  const labelMap: Record<string, string> = {
    "COMPANY_HOLIDAY": "Fixed Company Holiday",
    "OPTIONAL_HOLIDAY": "Optional Holiday",
    "RESTRICTED_HOLIDAY": "Restricted Holiday",
    "CUSTOM_HOLIDAY": "Special Holiday",
  };
  return <Badge variant="outline" className={`font-medium ${map[type] || "bg-muted text-muted-foreground"}`}>{labelMap[type] || type}</Badge>;
}

export default function HolidaysPage() {
  const user = useAuth();
  const db = useDB();
  const globalSearch = useGlobalSearch();

  const [viewMode, setViewMode] = useState<"month" | "year" | "table">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [selectedHolidayDetail, setSelectedHolidayDetail] = useState<any>(null);
  const [quickDatePreFill, setQuickDatePreFill] = useState<string | null>(null);

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

  // Filtered by type
  const typeFilteredHolidays = useMemo(() => {
    return holidaysWithMeta.filter((h) => {
      if (selectedType !== "all" && h.holidayType !== selectedType) return false;
      return true;
    });
  }, [holidaysWithMeta, selectedType]);

  // Calculate annual statistics for the current selected year
  const currentYear = currentDate.getFullYear();
  const yearHolidays = useMemo(() => {
    return holidaysWithMeta.filter((h) => {
      const startYear = new Date(h.startDate).getFullYear();
      const endYear = new Date(h.endDate).getFullYear();
      return startYear === currentYear || endYear === currentYear;
    });
  }, [holidaysWithMeta, currentYear]);

  const stats = useMemo(() => {
    const totalCount = yearHolidays.length;
    const companyHolidays = yearHolidays.filter(h => h.holidayType === "COMPANY_HOLIDAY");
    const totalOffDays = companyHolidays.reduce((acc, h) => acc + h.totalDays, 0);
    const optionalCount = yearHolidays.filter(h => h.holidayType === "OPTIONAL_HOLIDAY" || h.holidayType === "RESTRICTED_HOLIDAY").length;
    
    // Find next upcoming holiday from today
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const upcoming = holidaysWithMeta
      .filter(h => h.isActive && h.endDate >= todayStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

    return {
      totalCount,
      totalOffDays,
      optionalCount,
      upcoming
    };
  }, [yearHolidays, holidaysWithMeta]);

  // For Table View
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
    data: typeFilteredHolidays,
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
    if (confirm("Are you sure you want to delete this holiday from the calendar?")) {
      try {
        await api.deleteHoliday(id);
        toast.success("Holiday deleted successfully");
        if (selectedHolidayDetail?.id === id) {
          setSelectedHolidayDetail(null);
        }
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

  const openAddForDate = (dateStr: string) => {
    if (!isAdmin) return;
    setQuickDatePreFill(dateStr);
    setEditingHoliday(null);
    setIsApplyOpen(true);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Holiday Calendar" 
          description={`Fixed company holidays, annual calendar, and official scheduled breaks for ${currentYear}.`} 
        />
        
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center rounded-lg border bg-card p-1 shadow-sm">
            <Button
              size="sm"
              variant={viewMode === "month" ? "default" : "ghost"}
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => setViewMode("month")}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Month
            </Button>
            <Button
              size="sm"
              variant={viewMode === "year" ? "default" : "ghost"}
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => setViewMode("year")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Full Year
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => setViewMode("table")}
            >
              <List className="h-3.5 w-3.5" /> List Table
            </Button>
          </div>

          {isAdmin && (
            <Dialog open={isApplyOpen} onOpenChange={(v) => { setIsApplyOpen(v); if(!v) { setEditingHoliday(null); setQuickDatePreFill(null); } }}>
              <DialogTrigger asChild>
                <Button className="gap-1.5 shadow-sm">
                  <Plus className="h-4 w-4" /> Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingHoliday ? "Edit Holiday" : "Add Fixed Holiday to Calendar"}</DialogTitle>
                  <DialogDescription>
                    Configure fixed company holidays or broadcast urgent announcements.
                  </DialogDescription>
                </DialogHeader>
                <HolidayForm 
                  initialData={editingHoliday} 
                  preFillDate={quickDatePreFill}
                  onSuccess={() => { setIsApplyOpen(false); setEditingHoliday(null); setQuickDatePreFill(null); }} 
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Holidays ({currentYear})</p>
            <p className="text-xl font-bold leading-tight">{stats.totalCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Scheduled on calendar</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Company Fixed Off</p>
            <p className="text-xl font-bold leading-tight text-emerald-600 dark:text-emerald-400">{stats.totalOffDays} Days</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Official paid holidays</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Optional / Restricted</p>
            <p className="text-xl font-bold leading-tight text-sky-600 dark:text-sky-400">{stats.optionalCount} Events</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Flexible observances</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-medium">Next Upcoming</p>
            {stats.upcoming ? (
              <>
                <p className="text-sm font-bold truncate leading-tight">{stats.upcoming.name}</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                  {stats.upcoming.startDate} ({stats.upcoming.totalDays}d)
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">No upcoming</p>
            )}
          </div>
        </div>
      </div>

      {/* Filter / Nav Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {viewMode !== "table" && (
            <div className="flex items-center gap-1.5 mr-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth} title="Previous Month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} title="Next Month">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold ml-2">
                {format(currentDate, viewMode === "year" ? "yyyy" : "MMMM yyyy")}
              </span>
            </div>
          )}

          {/* Quick Year Selector */}
          <Select 
            value={currentYear.toString()} 
            onValueChange={(y) => {
              const newD = new Date(currentDate);
              newD.setFullYear(parseInt(y, 10));
              setCurrentDate(newD);
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs font-medium">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                <SelectItem key={yr} value={yr.toString()}>{yr}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Holiday Type Filter */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-8 w-44 text-xs font-medium">
              <SelectValue placeholder="All Holiday Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Holiday Types</SelectItem>
              <SelectItem value="COMPANY_HOLIDAY">Fixed Company Holidays</SelectItem>
              <SelectItem value="OPTIONAL_HOLIDAY">Optional Holidays</SelectItem>
              <SelectItem value="RESTRICTED_HOLIDAY">Restricted Holidays</SelectItem>
              <SelectItem value="CUSTOM_HOLIDAY">Special Holidays</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "table" && (
            <div className="relative w-full md:w-64">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search holidays..."
                className="pl-8 h-8 text-xs"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  api.setGlobalSearch(e.target.value);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main View Display */}
      {viewMode === "month" && (
        <MonthCalendarView 
          currentDate={currentDate} 
          holidays={typeFilteredHolidays}
          isAdmin={isAdmin}
          onSelectHoliday={(h) => setSelectedHolidayDetail(h)}
          onAddDate={(dateStr) => openAddForDate(dateStr)}
        />
      )}

      {viewMode === "year" && (
        <YearCalendarView 
          year={currentYear}
          holidays={typeFilteredHolidays}
          isAdmin={isAdmin}
          onSelectHoliday={(h) => setSelectedHolidayDetail(h)}
          onAddDate={(dateStr) => openAddForDate(dateStr)}
          onSelectMonth={(mIdx) => {
            const newD = new Date(currentYear, mIdx, 1);
            setCurrentDate(newD);
            setViewMode("month");
          }}
        />
      )}

      {viewMode === "table" && (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
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
                    Duration
                  </SortableHeader>
                  <SortableHeader field="isActive" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Status
                  </SortableHeader>
                  {isAdmin && <TableHead className="w-[180px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground">
                      No holidays found.
                    </TableCell>
                  </TableRow>
                )}
                {paginatedData.map((holiday) => {
                  const days = holiday.totalDays;
                  const isMulti = holiday.startDate !== holiday.endDate;
                  return (
                    <TableRow key={holiday.id} className={!holiday.isActive ? "opacity-60" : ""}>
                      <TableCell>
                        <div 
                          className="font-medium cursor-pointer hover:underline text-foreground"
                          onClick={() => setSelectedHolidayDetail(holiday)}
                        >
                          {holiday.name}
                        </div>
                        {holiday.description && (
                          <div className="text-xs text-muted-foreground max-w-sm truncate" title={holiday.description}>
                            {holiday.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <HolidayTypeBadge type={holiday.holidayType} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium whitespace-nowrap">
                          {isMulti ? (
                            <span>{holiday.startDate} <span className="text-muted-foreground font-normal">to</span> {holiday.endDate}</span>
                          ) : (
                            <span>{holiday.startDate}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{days} Day{days > 1 ? "s" : ""}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={holiday.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
                          {holiday.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Switch 
                              checked={holiday.isActive} 
                              onCheckedChange={() => handleToggleStatus(holiday)} 
                              title={holiday.isActive ? "Deactivate" : "Activate"}
                            />
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setEditingHoliday(holiday); setIsApplyOpen(true); }}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(holiday.id)}>
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
      )}

      {/* Holiday Details Modal */}
      {selectedHolidayDetail && (
        <Dialog open={!!selectedHolidayDetail} onOpenChange={(v) => !v && setSelectedHolidayDetail(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <HolidayTypeBadge type={selectedHolidayDetail.holidayType} />
                <Badge variant="outline" className={selectedHolidayDetail.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}>
                  {selectedHolidayDetail.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <DialogTitle className="text-xl">{selectedHolidayDetail.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Scheduled Date</p>
                <p className="font-semibold text-base">
                  {selectedHolidayDetail.startDate === selectedHolidayDetail.endDate ? (
                    format(parseISO(selectedHolidayDetail.startDate), "EEEE, MMMM d, yyyy")
                  ) : (
                    `${format(parseISO(selectedHolidayDetail.startDate), "MMM d, yyyy")} to ${format(parseISO(selectedHolidayDetail.endDate), "MMM d, yyyy")}`
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Duration: <span className="font-medium text-foreground">{selectedHolidayDetail.totalDays} day(s)</span>
                </p>
              </div>

              {selectedHolidayDetail.description ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Notes / Details</p>
                  <p className="text-foreground leading-relaxed">{selectedHolidayDetail.description}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No extra description provided.</p>
              )}
            </div>

            <DialogFooter className="flex sm:justify-between items-center gap-2 pt-3 border-t">
              {isAdmin ? (
                <div className="flex items-center gap-2 w-full justify-between">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDelete(selectedHolidayDetail.id)}
                  >
                    Delete
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const h = selectedHolidayDetail;
                        setSelectedHolidayDetail(null);
                        setEditingHoliday(h);
                        setIsApplyOpen(true);
                      }}
                    >
                      Edit Holiday
                    </Button>
                    <Button size="sm" onClick={() => setSelectedHolidayDetail(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <Button className="w-full" onClick={() => setSelectedHolidayDetail(null)}>Close</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ---------------- Month Calendar View ----------------
function MonthCalendarView({
  currentDate,
  holidays,
  isAdmin,
  onSelectHoliday,
  onAddDate,
}: {
  currentDate: Date;
  holidays: any[];
  isAdmin: boolean;
  onSelectHoliday: (h: any) => void;
  onAddDate: (dateStr: string) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Helper to check if a holiday falls on this day
  const getHolidaysForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return holidays.filter(h => h.isActive && dayStr >= h.startDate && dayStr <= h.endDate);
  };

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b text-center text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
        {weekDays.map((d, i) => (
          <div key={d} className={`py-2.5 ${i === 0 || i === 6 ? "text-amber-600 dark:text-amber-400 font-extrabold" : ""}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
        {days.map((day) => {
          const isCurrMonth = isSameMonth(day, monthStart);
          const isCurrentToday = isToday(day);
          const dayStr = format(day, "yyyy-MM-dd");
          const dayHolidays = getHolidaysForDay(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[105px] md:min-h-[120px] p-1.5 flex flex-col justify-between transition-colors group relative ${
                !isCurrMonth ? "bg-muted/20 text-muted-foreground/50 opacity-60" : ""
              } ${isWeekend && isCurrMonth ? "bg-muted/10" : ""} hover:bg-muted/30`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold h-6 w-6 rounded-full ${
                    isCurrentToday 
                      ? "bg-primary text-primary-foreground font-bold shadow-sm" 
                      : isWeekend && isCurrMonth 
                        ? "text-amber-700 dark:text-amber-400" 
                        : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>

                {isAdmin && isCurrMonth && (
                  <button
                    type="button"
                    onClick={() => onAddDate(dayStr)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    title={`Add fixed holiday on ${dayStr}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Holiday Pills */}
              <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                {dayHolidays.map((h) => {
                  const typeColor = h.holidayType === "COMPANY_HOLIDAY"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                    : h.holidayType === "OPTIONAL_HOLIDAY"
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 hover:bg-sky-500/25"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25";

                  return (
                    <div
                      key={h.id}
                      onClick={() => onSelectHoliday(h)}
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border truncate cursor-pointer transition-all ${typeColor}`}
                      title={`${h.name} (${h.holidayType})`}
                    >
                      🎉 {h.name}
                    </div>
                  );
                })}
              </div>

              {/* Empty placeholder if no holidays */}
              {dayHolidays.length === 0 && <div className="flex-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Year Overview View (12 Months) ----------------
function YearCalendarView({
  year,
  holidays,
  isAdmin,
  onSelectHoliday,
  onAddDate,
  onSelectMonth
}: {
  year: number;
  holidays: any[];
  isAdmin: boolean;
  onSelectHoliday: (h: any) => void;
  onAddDate: (dateStr: string) => void;
  onSelectMonth: (mIdx: number) => void;
}) {
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  const weekLetters = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map((m, mIdx) => {
          const mStart = startOfMonth(m);
          const mEnd = endOfMonth(mStart);
          const sDate = startOfWeek(mStart);
          const eDate = endOfWeek(mEnd);
          const mDays = eachDayOfInterval({ start: sDate, end: eDate });

          // Count holidays in this month
          const monthStr = format(m, "yyyy-MM");
          const monthHolidays = holidays.filter(h => h.isActive && (h.startDate.startsWith(monthStr) || h.endDate.startsWith(monthStr)));

          return (
            <div key={mIdx} className="bg-card border rounded-xl p-3 shadow-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={() => onSelectMonth(mIdx)}
                  className="font-bold text-sm hover:text-primary transition-colors text-left"
                >
                  {format(m, "MMMM")}
                </button>
                {monthHolidays.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {monthHolidays.length} holiday{monthHolidays.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted-foreground mb-1">
                {weekLetters.map((l, i) => (
                  <span key={i} className={i === 0 || i === 6 ? "text-amber-600" : ""}>{l}</span>
                ))}
              </div>

              {/* Mini month grid */}
              <div className="grid grid-cols-7 text-center text-[11px] gap-y-1">
                {mDays.map((d) => {
                  const isCurrentMonth = isSameMonth(d, mStart);
                  const dStr = format(d, "yyyy-MM-dd");
                  const holiday = holidays.find(h => h.isActive && dStr >= h.startDate && dStr <= h.endDate);
                  const isTodayDate = isToday(d);

                  return (
                    <div key={d.toISOString()} className="flex justify-center items-center py-0.5">
                      {isCurrentMonth ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (holiday) onSelectHoliday(holiday);
                            else onAddDate(dStr);
                          }}
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] transition-transform font-medium ${
                            holiday
                              ? "bg-emerald-500 text-white font-bold hover:scale-125 shadow-sm"
                              : isTodayDate
                                ? "border border-primary font-bold text-primary"
                                : "hover:bg-muted text-foreground"
                          }`}
                          title={holiday ? `${dStr}: ${holiday.name}` : dStr}
                        >
                          {format(d, "d")}
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30 text-[9px]">{format(d, "d")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Annual Summary List */}
      <div className="bg-card border rounded-xl p-4 md:p-6 shadow-sm">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> Full Schedule for {year}
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full py-4 text-center">No fixed holidays recorded for {year}.</p>
          ) : (
            holidays.map((h) => (
              <div 
                key={h.id} 
                onClick={() => onSelectHoliday(h)}
                className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate">{h.name}</span>
                  <HolidayTypeBadge type={h.holidayType} />
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{h.startDate} {h.startDate !== h.endDate && `to ${h.endDate}`}</span>
                  <span className="font-medium">{h.totalDays} day(s)</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Add / Edit Form ----------------
function HolidayForm({ 
  initialData, 
  preFillDate, 
  onSuccess 
}: { 
  initialData: any;
  preFillDate: string | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(initialData?.startDate || preFillDate || format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(initialData?.endDate || preFillDate || format(new Date(), "yyyy-MM-dd"));
  const [notifyEmployees, setNotifyEmployees] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      holidayType: formData.get("holidayType") as string,
      startDate: startDate,
      endDate: endDate || startDate,
      isActive: formData.get("isActive") === "on",
      notifyEmployees: notifyEmployees,
    };

    if (new Date(data.endDate) < new Date(data.startDate)) {
      toast.error("End date cannot be before start date");
      setLoading(false);
      return;
    }

    try {
      if (initialData?.id) {
        await api.updateHoliday(initialData.id, data);
        toast.success("Holiday updated successfully in calendar");
      } else {
        await api.createHoliday(data);
        toast.success(
          notifyEmployees 
            ? "Holiday added to calendar & urgent broadcast sent!" 
            : "Fixed holiday added to calendar!"
        );
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save holiday");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="name">Holiday Name</Label>
        <Input 
          id="name" 
          name="name" 
          required 
          defaultValue={initialData?.name} 
          placeholder="e.g., Diwali Festival / Republic Day" 
        />
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="holidayType">Holiday Type</Label>
        <Select name="holidayType" defaultValue={initialData?.holidayType || "COMPANY_HOLIDAY"} required>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="COMPANY_HOLIDAY">Fixed Company Holiday (Official Off)</SelectItem>
            <SelectItem value="OPTIONAL_HOLIDAY">Optional Holiday</SelectItem>
            <SelectItem value="RESTRICTED_HOLIDAY">Restricted Holiday</SelectItem>
            <SelectItem value="CUSTOM_HOLIDAY">Special / Custom Holiday</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start Date</Label>
          <Input 
            id="startDate" 
            type="date" 
            required 
            value={startDate} 
            onChange={(e) => {
              setStartDate(e.target.value);
              if (!initialData && (!endDate || endDate < e.target.value)) {
                setEndDate(e.target.value);
              }
            }} 
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End Date</Label>
          <Input 
            id="endDate" 
            type="date" 
            required 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description / Note (Optional)</Label>
        <Textarea 
          id="description" 
          name="description" 
          placeholder="Additional details about this holiday..." 
          defaultValue={initialData?.description} 
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="isActive" className="font-semibold text-sm">Active Holiday</Label>
          <p className="text-xs text-muted-foreground">Holiday is accounted for in company off days & leave deductions</p>
        </div>
        <Switch id="isActive" name="isActive" defaultChecked={initialData ? initialData.isActive : true} />
      </div>

      {/* Urgent notification toggle */}
      {!initialData && (
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <Label htmlFor="notifyEmployees" className="font-semibold text-sm cursor-pointer">
                Send Urgent Notification to Employees
              </Label>
            </div>
            <Switch 
              id="notifyEmployees" 
              checked={notifyEmployees} 
              onCheckedChange={setNotifyEmployees} 
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {notifyEmployees ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Will send an urgent push notification broadcast to all active employees and HR.
              </span>
            ) : (
              <span>
                ℹ️ Regular fixed holidays will simply appear on the calendar without disturbing employees with notifications.
              </span>
            )}
          </p>
        </div>
      )}

      <DialogFooter className="pt-3">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving..." : initialData ? "Update Holiday" : "Add to Holiday Calendar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
