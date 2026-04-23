import { Button } from "@/components/ui/button";
import { Copy, Globe, LucideShare } from "lucide-react";

export default function OnlineStoreCard() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm mb-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
          <Globe className="text-blue-600 text-xl" />
        </span>
        <div>
          <div className="font-medium text-gray-900">Online Store</div>
          <div className="text-sm text-gray-500">
            Manage your online storefront, products, and online orders
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex items-center gap-1 border-blue-600">
          <LucideShare className="text-blue-600 text-base" /> Visit Online Store
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-1 border-blue-600">
          <Copy className="text-blue-600 text-base" />
          Copy Link
        </Button>
      </div>
    </div>
  );
}
