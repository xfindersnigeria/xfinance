import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const getManualJournalColumns = (onPostClick?: (journalId: string) => void): Column<any>[] => [
  {
    key: "reference",
    title: "Entry #",
    className: "text-xs font-medium",
    render: (value) => (
      <span className="text-gray-900 font-semibold">{value || "-"}</span>
    ),
  },
  {
    key: "date",
    title: "Date",
    className: "text-xs",
    render: (value) => {
      if (!value) return <span>-</span>;
      try {
        return <span className="text-gray-700">{new Date(value).toLocaleDateString()}</span>;
      } catch {
        return <span className="text-gray-700">{value}</span>;
      }
    },
  },
  {
    key: "description",
    title: "Description",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700 line-clamp-2">{value || "-"}</span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "Posted") {
        return (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            Posted
          </Badge>
        );
      }
      if (value === "Draft") {
        return (
          <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
            Draft
          </Badge>
        );
      }
      return (
        <Badge className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
          {value}
        </Badge>
      );
    },
  },
  {
    key: "actions",
    title: "Actions",
    className: "w-20 text-xs",
    render: (_, row) => (
      <div className="flex gap-2 items-center">
        {row.status === "Draft" ? (
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-green-100 text-green-600"
            onClick={() => onPostClick?.(row.id)}
            title="Post Journal"
          >
            <Check className="w-4 h-4" />
          </Button>
        ):(
          <span>--</span>
        )}
      </div>
    ),
    searchable: false,
  },
];

export const manualJournalColumns = getManualJournalColumns();