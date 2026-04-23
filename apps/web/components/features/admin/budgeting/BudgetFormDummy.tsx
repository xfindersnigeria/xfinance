'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BudgetFormDummyProps {
  onSuccess?: () => void;
}

export function BudgetFormDummy({ onSuccess }: BudgetFormDummyProps) {
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setLoading(false);
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="budget-name" className="text-sm font-medium">
          Budget Name
        </Label>
        <Input
          id="budget-name"
          placeholder="e.g., Q4 2025 Operations Budget"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entity" className="text-sm font-medium">
          Entity
        </Label>
        <Select>
          <SelectTrigger id="entity">
            <SelectValue placeholder="Select entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="us">Hunslow Inc US</SelectItem>
            <SelectItem value="uk">Hunslow Ltd UK</SelectItem>
            <SelectItem value="de">Hunslow GmbH DE</SelectItem>
            <SelectItem value="asia">Hunslow Asia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget-amount" className="text-sm font-medium">
          Budget Amount
        </Label>
        <Input
          id="budget-amount"
          type="number"
          placeholder="0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="period" className="text-sm font-medium">
          Period
        </Label>
        <Select>
          <SelectTrigger id="period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="q4-2025">Q4 2025</SelectItem>
            <SelectItem value="q1-2026">Q1 2026</SelectItem>
            <SelectItem value="q2-2026">Q2 2026</SelectItem>
            <SelectItem value="q3-2026">Q3 2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department" className="text-sm font-medium">
          Department
        </Label>
        <Select>
          <SelectTrigger id="department">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales & Marketing</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="administration">Administration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 space-y-3">
        <Button
          type="submit"
          disabled={loading}
          className="w-full "
        >
          {loading ? 'Creating...' : 'Create Budget'}
        </Button>
      </div>
    </form>
  );
}
