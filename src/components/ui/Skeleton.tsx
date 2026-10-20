import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from './Card';

// ==========================================
// 1. BASE SKELETON PRIMITIVES
// ==========================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rounded',
  width,
  height,
  shimmer = true,
  className,
  style,
  ...props
}) => {
  const variantClasses = {
    text: 'h-4 rounded-md',
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-2xl'
  };

  const inlineStyles: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {})
  };

  return (
    <div
      className={cn(
        'bg-slate-200/80',
        variantClasses[variant],
        shimmer && 'shimmer-effect',
        className
      )}
      style={inlineStyles}
      {...props}
    />
  );
};

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 2, className, lastLineWidth = 'w-3/5' }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            'h-3.5',
            i === lines - 1 && lines > 1 ? lastLineWidth : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

// ==========================================
// 2. STAT CARD SKELETON (KPI Cards)
// ==========================================

export const SkeletonStatCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card className={cn('p-5 bg-white border-slate-200/80 flex flex-col justify-between', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton variant="rounded" className="w-8 h-8 rounded-xl" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-3 w-28 rounded-md" />
      </div>
    </Card>
  );
};

// ==========================================
// 3. TABLE SKELETON
// ==========================================

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 6, columns = 6, className }) => {
  return (
    <div className={cn('bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs', className)}>
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-20 rounded-md" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-5 py-4 flex items-center justify-between gap-4">
            {/* Column 1: Avatar + Name + Subtitle */}
            <div className="flex items-center gap-3 w-48 shrink-0">
              <Skeleton variant="circular" className="w-9 h-9 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-2.5 w-36 rounded-md" />
              </div>
            </div>

            {/* Other columns */}
            {Array.from({ length: columns - 2 }).map((_, c) => (
              <Skeleton key={c} className="h-4 w-24 rounded-md hidden sm:block" />
            ))}

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="w-7 h-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 4. ADMIN DASHBOARD SKELETON
// ==========================================

export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <Skeleton className="h-8 w-64 sm:w-80 rounded-lg mt-1" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>

        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-32 rounded-2xl" />
          <Skeleton className="h-10 w-40 rounded-2xl" />
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Next Service Live Banner Skeleton */}
      <Card className="p-6 bg-slate-900 border-slate-800 text-white rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full bg-slate-800" />
              <Skeleton className="h-5 w-32 rounded-full bg-slate-800" />
            </div>
            <Skeleton className="h-7 w-64 sm:w-96 rounded-lg bg-slate-800" />
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-4 w-36 rounded-md bg-slate-800" />
              <Skeleton className="h-4 w-40 rounded-md bg-slate-800" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-32 rounded-2xl bg-slate-800" />
            <Skeleton className="h-11 w-44 rounded-2xl bg-emerald-800/60" />
          </div>
        </div>
      </Card>

      {/* 2-Column Grid Skeleton: Recent Attendance & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1 */}
        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-52 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>

          <div className="divide-y divide-slate-100 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                    <Skeleton className="h-2.5 w-20 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        {/* Card 2 */}
        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-44 rounded-md" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>

          <div className="space-y-3 pt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-44 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-28 rounded-md" />
                  <Skeleton className="h-3 w-32 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ==========================================
// 5. MEMBER DASHBOARD SKELETON
// ==========================================

export const MemberDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32 rounded-md bg-white/20" />
          <Skeleton className="h-8 w-56 sm:w-72 rounded-lg bg-white/20" />
          <Skeleton className="h-3 w-48 rounded-md bg-white/20" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl bg-white/10" />
          <Skeleton className="h-9 w-24 rounded-xl bg-white/10" />
        </div>
      </div>

      {/* 2. Next Activity Hero Card Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-3 w-36 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>

        <Card className="p-6 bg-white border-slate-200/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
              <Skeleton className="h-6 w-64 sm:w-80 rounded-lg" />
              <Skeleton className="h-3.5 w-72 rounded-md" />
            </div>

            <Skeleton className="h-10 w-32 sm:w-40 rounded-2xl shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </Card>
      </div>

      {/* 3. 2-Column Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance widget */}
        <Card className="p-5 bg-white border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
        </Card>

        {/* Announcements widget */}
        <Card className="p-5 bg-white border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5">
              <Skeleton className="h-4 w-44 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ==========================================
// 6. MEMBERS MANAGEMENT SKELETON
// ==========================================

export const MembersManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>

      {/* Filter and Search Controls */}
      <Card className="p-4 bg-white border-slate-200/80">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
        </div>
      </Card>

      {/* Desktop Table */}
      <SkeletonTable rows={7} columns={7} />

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between px-2 pt-2">
        <Skeleton className="h-3.5 w-40 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 7. EVENTS MANAGEMENT SKELETON
// ==========================================

export const EventsManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-60 rounded-lg" />
          <Skeleton className="h-3.5 w-80 rounded-md" />
        </div>
        <Skeleton className="h-10 w-44 rounded-2xl" />
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6 bg-white border-slate-200/80 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                </div>
                <Skeleton className="h-6 w-72 sm:w-96 rounded-lg" />
                <Skeleton className="h-3.5 w-full max-w-xl rounded-md" />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-9 w-28 rounded-xl" />
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <Skeleton className="h-8 rounded-xl" />
              <Skeleton className="h-8 rounded-xl" />
              <Skeleton className="h-8 rounded-xl" />
              <Skeleton className="h-8 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 8. ATTENDANCE MANAGEMENT SKELETON
// ==========================================

export const AttendanceManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Title */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-64 rounded-lg" />
        <Skeleton className="h-3.5 w-72 rounded-md" />
      </div>

      {/* Selectors Bar */}
      <Card className="p-4 bg-white border-slate-200/80">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
          <Skeleton className="h-10 rounded-2xl" />
        </div>
      </Card>

      {/* Overview Card */}
      <Card className="p-6 bg-slate-800 text-white rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24 rounded-full bg-slate-700" />
            <Skeleton className="h-6 w-64 rounded-lg bg-slate-700" />
            <Skeleton className="h-3.5 w-48 rounded-md bg-slate-700" />
          </div>

          <div className="flex items-center gap-6 bg-white/10 px-6 py-3 rounded-2xl">
            <div className="space-y-1 text-center">
              <Skeleton className="h-2.5 w-14 rounded-md bg-white/20 mx-auto" />
              <Skeleton className="h-6 w-10 rounded-md bg-white/20 mx-auto" />
            </div>
            <div className="space-y-1 text-center">
              <Skeleton className="h-2.5 w-14 rounded-md bg-white/20 mx-auto" />
              <Skeleton className="h-6 w-10 rounded-md bg-white/20 mx-auto" />
            </div>
            <div className="space-y-1 text-center">
              <Skeleton className="h-2.5 w-16 rounded-md bg-white/20 mx-auto" />
              <Skeleton className="h-6 w-12 rounded-md bg-white/20 mx-auto" />
            </div>
          </div>
        </div>
      </Card>

      {/* Member Attendance List */}
      <Card className="p-5 bg-white border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-3 w-56 rounded-md" />
        </div>

        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-36 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ==========================================
// 9. CARD GRID SKELETON (Departments, Groups)
// ==========================================

export const CardGridSkeleton: React.FC<{
  title?: string;
  subtitle?: string;
  cardsCount?: number;
  columns?: '2' | '3';
}> = ({
  cardsCount = 6,
  columns = '3'
}) => {
  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>

      <div className={cn(
        'grid grid-cols-1 gap-4',
        columns === '3' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'
      )}>
        {Array.from({ length: cardsCount }).map((_, i) => (
          <Card key={i} className="p-5 bg-white border-slate-200/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>

              <SkeletonText lines={2} lastLineWidth="w-4/5" />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded-md" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="w-7 h-7 rounded-lg" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 10. ACTIVITIES VIEW SKELETON
// ==========================================

export const ActivitiesViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6 bg-white border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
                <Skeleton className="h-6 w-64 sm:w-80 rounded-lg" />
              </div>
              <div className="space-y-1 sm:text-right">
                <Skeleton className="h-4 w-32 rounded-md sm:ml-auto" />
                <Skeleton className="h-4 w-24 rounded-md sm:ml-auto" />
              </div>
            </div>

            <Skeleton className="h-3.5 w-full max-w-lg rounded-md" />

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 11. ATTENDANCE VIEW SKELETON (Member)
// ==========================================

export const AttendanceViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-3.5 w-56 rounded-md" />
        </div>
        <Skeleton className="h-7 w-36 rounded-full" />
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1 rounded-2xl" />
        <Skeleton className="h-10 w-full sm:w-44 rounded-2xl" />
      </div>

      {/* Attendance History List */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-5 bg-white border-slate-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44 rounded-md" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 12. ANNOUNCEMENTS VIEW SKELETON
// ==========================================

export const AnnouncementsViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-40 rounded-2xl" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6 bg-white border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>

            <Skeleton className="h-5 w-64 sm:w-80 rounded-lg" />
            <SkeletonText lines={3} lastLineWidth="w-3/4" />

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Skeleton className="h-3 w-36 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 13. NOTIFICATIONS VIEW SKELETON
// ==========================================

export const NotificationsViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-5 bg-white border-slate-200/80 flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3 w-2/3 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 14. REPORTS MANAGEMENT SKELETON
// ==========================================

export const ReportsManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Table */}
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
};

// ==========================================
// 15. SETTINGS MANAGEMENT SKELETON
// ==========================================

export const SettingsManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-3.5 w-80 rounded-md" />
      </div>

      <div className="space-y-6">
        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <Skeleton className="h-5 w-44 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
          <Skeleton className="h-12 rounded-2xl" />
        </Card>

        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <Skeleton className="h-5 w-48 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        </Card>
      </div>
    </div>
  );
};

// ==========================================
// 16. PROFILE VIEW SKELETON
// ==========================================

export const ProfileViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header Profile Card Skeleton */}
      <Card className="p-6 sm:p-8 bg-white border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <Skeleton variant="circular" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Skeleton className="h-7 w-48 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-56 rounded-md" />
              <Skeleton className="h-3.5 w-32 rounded-md" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <Skeleton className="h-10 w-36 rounded-2xl" />
            <Skeleton className="h-10 w-32 rounded-2xl" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      </Card>

      {/* Details Sections Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <Skeleton className="h-4 w-40 rounded-md" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 rounded-2xl" />
            <Skeleton className="h-10 rounded-2xl" />
            <Skeleton className="h-10 rounded-2xl" />
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200/80 space-y-4">
          <Skeleton className="h-4 w-44 rounded-md" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 rounded-2xl" />
            <Skeleton className="h-10 rounded-2xl" />
            <Skeleton className="h-10 rounded-2xl" />
          </div>
        </Card>
      </div>
    </div>
  );
};

