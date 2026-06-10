import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-50 px-4">
      <div className="text-center">
        <div className="mb-4 text-6xl font-bold text-navy-200">404</div>
        <h1 className="mb-2 text-xl font-bold text-navy-900">Page not found</h1>
        <p className="mb-6 text-sm text-navy-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
