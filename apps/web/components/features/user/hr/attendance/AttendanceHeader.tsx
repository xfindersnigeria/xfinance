"use client";

import AttendanceStatCardSmall from "./AttendanceStatCardSmall";

interface AttendanceStats {
  totalPresentToday?: number;
  totalOnLeaveToday?: number;
  totalAbsentToday?: number;
  totalEmployees?: number;
  presentPercentage?: number;
  averageHoursMonth?: number;
}

interface AttendanceHeaderProps {
  stats?: AttendanceStats;
  loading: boolean;
}

export default function AttendanceHeader({ stats, loading }: AttendanceHeaderProps) {
  return (
    <div className="mb-6">
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AttendanceStatCardSmall
          title="Present Today"
          value={<span className="text-3xl">{stats?.totalPresentToday ?? 0}</span>}
          subtitle={`${stats?.presentPercentage ?? 0}% attendance`}
          loading={loading}
        />
        <AttendanceStatCardSmall
          title="On Leave Today"
          value={<span className="text-3xl">{stats?.totalOnLeaveToday ?? 0}</span>}
          subtitle={`of ${stats?.totalEmployees ?? 0} employees`}
          loading={loading}
        />
        <AttendanceStatCardSmall
          title="Absent Today"
          value={<span className="text-3xl">{stats?.totalAbsentToday ?? 0}</span>}
          subtitle={`of ${stats?.totalEmployees ?? 0} employees`}
          loading={loading}
        />
        <AttendanceStatCardSmall
          title="Avg Hours/Day"
          value={<span className="text-3xl">{stats?.averageHoursMonth ?? 0}</span>}
          subtitle="This month"
          loading={loading}
        />
      </div>
    </div>
  );
}
