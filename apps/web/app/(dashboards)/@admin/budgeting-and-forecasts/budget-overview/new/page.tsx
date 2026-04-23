import { SetGroupBudgetForm } from '@/components/features/admin/budgeting';

export default function NewBudgetPage() {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Set Group Budget</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create consolidated budget targets across all entities in the group
        </p>
      </div>
      <SetGroupBudgetForm />
    </div>
  );
}
