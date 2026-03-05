import { redirect } from "next/navigation";
export default function OfflinePaymentPage() {
  redirect("/admin/offline-payment/manual-methods");
}
