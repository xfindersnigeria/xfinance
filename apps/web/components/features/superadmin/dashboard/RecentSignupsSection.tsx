'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecentSignupData } from '@/lib/api/services/analyticsService';

interface RecentSignup {
  id: string;
  company: string;
  signupDate: string;
  users: number;
  mrr: string;
  plan: string;
  status: string;
}

interface RecentSignupsSectionProps {
  data?: RecentSignupData[];
}

const defaultRecentSignups: RecentSignup[] = [
  {
    id: '1',
    company: 'Tech Innovations Ltd',
    signupDate: '2025-11-08',
    users: 45,
    mrr: '₦125k/mo',
    plan: 'Enterprise',
    status: 'Active',
  },
  {
    id: '2',
    company: 'Digital Solutions Inc',
    signupDate: '2025-11-07',
    users: 12,
    mrr: '₦35k/mo',
    plan: 'Professional',
    status: 'Active',
  },
  {
    id: '3',
    company: 'Global Trade Corp',
    signupDate: '2025-11-06',
    users: 18,
    mrr: '₦35k/mo',
    plan: 'Professional',
    status: 'Trial',
  },
];

function getPlanColor(plan: string) {
  switch (plan) {
    case 'Enterprise':
      return 'bg-green-100 text-green-800';
    case 'Professional':
      return 'bg-indigo-100 text-indigo-800';
    case 'Starter':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800';
    case 'Trial':
      return 'bg-yellow-100 text-yellow-800';
    case 'Inactive':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function RecentSignupsSection({ data }: RecentSignupsSectionProps) {
  // Transform API data to display format
  const displayData: RecentSignup[] = data 
    ? data.map(signup => ({
        id: signup.id,
        company: signup.name,
        signupDate: new Date(signup.createdAt).toLocaleDateString('en-NG'),
        users: signup.userCount,
        mrr: new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          notation: 'compact',
          maximumFractionDigits: 0,
        }).format(signup.mrr),
        plan: signup.plan,
        status: signup.status,
      }))
    : defaultRecentSignups;
  return (
    <Card className="border border-gray-200 p-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Recent Sign-ups</h3>

        <div className="space-y-2">
          {displayData.map((signup) => (
            <div
              key={signup.id}
              className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Company Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{signup.company}</p>
                  <p className="text-xs text-gray-500">{signup.signupDate}</p>
                </div>
              </div>

              {/* Users Count */}
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-gray-900">{signup.users} users</p>
                <p className="text-xs text-gray-500">{signup.mrr}</p>
              </div>

              {/* Plan Badge */}
              <div className="shrink-0 px-3">
                <Badge className={`${getPlanColor(signup.plan)} text-xs font-medium`}>
                  {signup.plan}
                </Badge>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                <Badge className={`${getStatusColor(signup.status)} text-xs font-medium`}>
                  {signup.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
