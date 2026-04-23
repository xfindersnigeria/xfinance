"use client";

interface LineItem {
  id: string;
  description: string;
  details: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface LineItemsTableProps {
  items: LineItem[];
  currency: string;
}

export default function LineItemsTable({
  items,
  currency,
}: LineItemsTableProps) {
  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case "USD":
        return "$";
      case "NGN":
        return "₦";
      case "GBP":
        return "£";
      default:
        return "₦";
    }
  };

  return (
    <div className="mb-4">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900">
                #
              </th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900">
                Name
              </th>
              <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900 hidden sm:table-cell">
                Qty
              </th>
              <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900 hidden sm:table-cell">
                Rate
              </th>
              <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 sm:py-2 px-2 sm:px-4 text-gray-600">{idx + 1}</td>
                <td className="py-2 sm:py-2 px-2 sm:px-4">
                  <p className="text-gray-900 font-medium text-xs sm:text-sm">{item.description}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{item.details}</p>
                </td>
                <td className="py-2 sm:py-2 px-2 sm:px-4 text-center text-gray-900 hidden sm:table-cell">
                  {item.quantity}
                </td>
                <td className="py-2 sm:py-2 px-2 sm:px-4 text-center text-gray-900 hidden sm:table-cell">
                  {getCurrencySymbol(currency)}
                  {item.rate.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2 sm:py-2 px-2 sm:px-4 text-right text-gray-900 font-medium text-xs sm:text-sm">
                  {getCurrencySymbol(currency)}
                  {item.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
