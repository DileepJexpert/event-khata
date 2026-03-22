import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Vendor } from "@/lib/types";

interface VendorPaymentCardProps {
  vendor: Vendor;
  agreedAmount: number;
  totalPaid: number;
}

export function VendorPaymentCard({
  vendor,
  agreedAmount,
  totalPaid,
}: VendorPaymentCardProps) {
  const balance = agreedAmount - totalPaid;
  const percentage = agreedAmount > 0 ? Math.min((totalPaid / agreedAmount) * 100, 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h4 className="font-semibold">{vendor.name}</h4>
            {vendor.category && (
              <Badge variant="secondary" className="mt-1 capitalize">
                {vendor.category.replace("_", " ")}
              </Badge>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-navy-500">Agreed</p>
            <p className="font-semibold">{formatCurrency(agreedAmount)}</p>
          </div>
        </div>

        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-emerald-600">
            Paid: {formatCurrency(totalPaid)}
          </span>
          <span className={balance > 0 ? "text-amber-600" : "text-emerald-600"}>
            {balance > 0 ? `Due: ${formatCurrency(balance)}` : "Settled"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
