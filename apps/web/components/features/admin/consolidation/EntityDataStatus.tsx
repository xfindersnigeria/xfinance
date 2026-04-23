"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EntityStatus {
  name: string;
  status: "Complete" | "In Progress";
  lastUpdated: string;
}

const entities: EntityStatus[] = [
  {
    name: "Hunslow Inc. (US)",
    status: "Complete",
    lastUpdated: "Updated 2025-11-05 14:30",
  },
  {
    name: "Hunslow UK Ltd",
    status: "Complete",
    lastUpdated: "Updated 2025-11-05 13:45",
  },
  {
    name: "Hunslow GmbH (DE)",
    status: "Complete",
    lastUpdated: "Updated 2025-11-05 15:30",
  },
  {
    name: "Hunslow Asia Pte Ltd",
    status: "In Progress",
    lastUpdated: "Updated 2025-11-05 09:15",
  },
];

export default function EntityDataStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entity Data Status</CardTitle>
        <CardDescription>Data submission and validation status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {entities.map((entity, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 bg-gray-100 p-1 rounded-md"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{entity.name}</h4>
                <Badge
                  className={`rounded-full ${
                    entity.status === "Complete"
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  {entity.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{entity.lastUpdated}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
