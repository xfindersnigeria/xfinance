import { fmtAmount } from "@/lib/api/hooks/useCurrencyFormat";
import { paymentMethodLabel, type Order } from "@/lib/api/services/ordersService";
import { taxLabel } from "@/lib/tax/totals";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Opens a small window with a till-style receipt and prints it. Returns false
 * when the browser blocked the popup.
 */
export function printOrderReceipt(order: Order, sym: string, businessName?: string): boolean {
  const win = window.open("", "_blank", "width=380,height=640");
  if (!win) return false;

  const money = (n: number) => esc(fmtAmount(Number(n) || 0, sym));
  const date = new Date(order.completedAt ?? order.createdAt).toLocaleString();
  const rows = order.items
    .map(
      (i) => `<tr><td>${esc(i.name)}<div class="muted">${i.quantity} × ${money(i.rate)}</div></td><td class="r">${money(i.total)}</td></tr>`,
    )
    .join("");
  const taxRow =
    order.tax > 0 || order.taxRate > 0
      ? `<tr><td>${esc(taxLabel(order.taxName, order.taxRate, order.taxInclusive))}</td><td class="r">${money(order.tax)}</td></tr>`
      : "";

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(order.receipt?.receiptNumber ?? order.orderNumber)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;color:#111;margin:0;padding:16px;max-width:320px}
  h1{font-size:16px;margin:0 0 4px;text-align:center}
  .c{text-align:center}.r{text-align:right;white-space:nowrap}.muted{color:#666;font-size:12px}
  table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:4px 0;vertical-align:top}
  hr{border:0;border-top:1px dashed #999;margin:8px 0}
  .total td{font-weight:700;font-size:15px}
  @media print{body{padding:0}}
</style></head><body>
  <h1>${esc(businessName || "Receipt")}</h1>
  <div class="c muted">${esc(date)}</div>
  <hr/>
  <div>Order: ${esc(order.orderNumber)}</div>
  ${order.receipt ? `<div>Receipt: ${esc(order.receipt.receiptNumber)}</div>` : ""}
  <div>Customer: ${esc(order.customerName || "Walk-in customer")}</div>
  <hr/>
  <table>${rows}</table>
  <hr/>
  <table>
    <tr><td>Subtotal</td><td class="r">${money(order.subtotal)}</td></tr>
    ${taxRow}
    <tr class="total"><td>Total</td><td class="r">${money(order.total)}</td></tr>
    <tr><td class="muted">Paid by</td><td class="r muted">${esc(paymentMethodLabel(order.paymentMethod))}</td></tr>
  </table>
  <hr/>
  <div class="c muted">Thank you for your purchase</div>
  <script>window.onload=function(){window.focus();window.print();}</script>
</body></html>`);
  win.document.close();
  return true;
}
