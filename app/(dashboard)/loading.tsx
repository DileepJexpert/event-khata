export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-900 dark:border-navy-700 dark:border-t-navy-300" />
        <p className="text-sm text-navy-400">Loading...</p>
      </div>
    </div>
  );
}
