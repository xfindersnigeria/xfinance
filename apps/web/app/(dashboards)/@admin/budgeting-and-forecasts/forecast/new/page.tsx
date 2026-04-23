import { CreateForecastForm } from '@/components/features/admin/budgeting';

export default function NewForecastPage() {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Group Forecast</h1>
        <p className="text-sm text-gray-500 mt-1">
          Project consolidated financial performance across all entities
        </p>
      </div>
      <CreateForecastForm />
    </div>
  );
}
