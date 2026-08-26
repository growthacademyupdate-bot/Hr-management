import React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SortOrder } from "@/hooks/useDataTable";
import { cn } from "@/lib/utils";

interface SortableHeaderProps extends React.ComponentPropsWithoutRef<typeof TableHead> {
  field: string;
  currentSortField?: string;
  currentSortOrder?: SortOrder;
  onSort?: (field: string) => void;
  children: React.ReactNode;
}

export function SortableHeader({
  field,
  currentSortField,
  currentSortOrder,
  onSort,
  children,
  className,
  ...props
}: SortableHeaderProps) {
  const isSorted = currentSortField === field;

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        isSorted && "font-bold text-foreground",
        className
      )}
      onClick={() => onSort?.(field)}
      {...props}
    >
      <div className="flex items-center gap-1.5 py-1">
        <span>{children}</span>
        {isSorted ? (
          currentSortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 hover:text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
}
