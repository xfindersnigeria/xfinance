"use client";

import { Send, CheckCircle } from "lucide-react";

interface Activity {
  id: string;
  action: string;
description: string;
  date: string;
  actor: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export default function ActivityTimeline({
  activities,
}: ActivityTimelineProps) {
  const getActivityIcon = (action: string) => {
    if (action.includes("sent")) {
      return <Send className="w-4 h-4 text-blue-500" />;
    }
    if (action.includes("created")) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4 text-sm">Activity Timeline</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-2">
            <div className="shrink-0 mt-1">
              {getActivityIcon(activity.action)}
            </div>
            <div className="grow">
              <p className="text-sm font-medium text-gray-900">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {activity.date} by {activity.actor}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
