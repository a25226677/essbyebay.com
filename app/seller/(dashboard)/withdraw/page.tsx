"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Frown,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Send,
  Wallet,
  Shield,
  Upload,
} from "lucide-react";

/* ─── Types ─── */
type WithdrawItem = {
  id: string;
  index: number;
  date: string;
  amount: number;
  method: string;
  type: string;
  status: string;
  withdraw_type: string;
  remarks: string;
  message: string;
};

type FrozeOrder = {
  id: string;
  index: number;
  order_code: string;
  amount: number;
  profit: number;
  payment_status: string;
  pickup_status: string;
  date: string;
  unfreeze_countdown: string;
};

type WithdrawData = {
  pendingBalance: number;
  walletMoney: number;
  guaranteeMoney: number;
  history: WithdrawItem[];
  frozeOrders: FrozeOrder[];
  paymentMethods: { id: string; heading: string; logo_url: string | null }[];
  bankInfo: { bank_name: string; account_name: string; account_number: string; routing_number: string } | null;
};

const statusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  "Un-Paid": "bg-red-100 text-red-700",
  Paid: "bg-green-100 text-green-700",
  "Unpicked Up": "bg-amber-100 text-amber-700",
  "Picked Up": "bg-green-100 text-green-700",
};

export default function MoneyWithdrawPage() {
  const [data, setData] = useState<WithdrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Modal states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showGuaranteeModal, setShowGuaranteeModal] = useState(false);

  // Withdraw form
  const [wAmount, setWAmount] = useState("");
  const [wOperaType, setWOperaType] = useState("User Balance");
  const [wWithdrawType, setWWithdrawType] = useState("Bank");
  const [wMessage, setWMessage] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  // Offline Recharge form
  const [rSelectedMethod, setRSelectedMethod] = useState("Bank");
  const [rAmount, setRAmount] = useState("");
  const [rPhoto, setRPhoto] = useState<File | null>(null);
  const [rSubmitting, setRSubmitting] = useState(false);
  const rFileRef = useRef<HTMLInputElement>(null);

  // Guarantee Recharge form
  const [gAmount, setGAmount] = useState("");
  const [gPhoto, setGPhoto] = useState<File | null>(null);
  const [gSubmitting, setGSubmitting] = useState(false);
  const gFileRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/withdraw", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const showMsg = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  };

  /* ─── Submit Withdraw Request ─── */
  const handleWithdraw = async () => {
    setWSubmitting(true);
    try {
      const amt = parseFloat(wAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const res = await fetch("/api/seller/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          method: wWithdrawType,
          opera_type: wOperaType,
          message: wMessage,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      showMsg("Withdrawal request submitted!");
      setShowWithdrawModal(false);
      setWAmount(""); setWMessage("");
      await loadData();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Failed", true);
    } finally {
      setWSubmitting(false);
    }
  };

  /* ─── Submit Offline Recharge ─── */
  const handleRecharge = async () => {
    setRSubmitting(true);
    try {
      const amt = parseFloat(rAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const formData = new FormData();
      formData.append("amount", String(amt));
      formData.append("method", rSelectedMethod);
      if (rPhoto) formData.append("photo", rPhoto);

      const res = await fetch("/api/seller/withdraw/recharge", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showMsg("Recharge request submitted!");
      setShowRechargeModal(false);
      setRAmount(""); setRPhoto(null);
      await loadData();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Failed", true);
    } finally {
      setRSubmitting(false);
    }
  };

  /* ─── Submit Guarantee Recharge ─── */
  const handleGuarantee = async () => {
    setGSubmitting(true);
    try {
      const amt = parseFloat(gAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const formData = new FormData();
      formData.append("amount", String(amt));
      if (gPhoto) formData.append("photo", gPhoto);

      const res = await fetch("/api/seller/withdraw/guarantee", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showMsg("Guarantee recharge request submitted!");
      setShowGuaranteeModal(false);
      setGAmount(""); setGPhoto(null);
      await loadData();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Failed", true);
    } finally {
      setGSubmitting(false);
    }
  };

  const pendingBalance = data?.pendingBalance ?? 0;
  const walletMoney = data?.walletMoney ?? 0;
  const guaranteeMoney = data?.guaranteeMoney ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Money Withdraw</h1>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="size-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Top Balance Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Pending Balance */}
        <div className="bg-gradient-to-br from-red-400 to-red-500 text-white rounded-xl p-5 text-center">
          <div className="size-8 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Loader2 className="size-4" />
          </div>
          <p className="text-2xl font-bold">${pendingBalance.toFixed(2)}</p>
          <p className="text-xs opacity-80 mt-1">Pending Balance</p>
        </div>

        {/* Wallet Money */}
        <div className="bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-xl p-5 text-center">
          <div className="size-8 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Wallet className="size-4" />
          </div>
          <p className="text-2xl font-bold">${walletMoney.toFixed(2)}</p>
          <p className="text-xs opacity-80 mt-1">Wallet Money</p>
        </div>

        {/* Send Withdraw Request */}
        <button
          onClick={() => setShowWithdrawModal(true)}
          className="bg-gradient-to-br from-teal-400 to-teal-500 text-white rounded-xl p-5 text-center hover:shadow-lg transition-shadow"
        >
          <div className="size-10 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Send className="size-5" />
          </div>
          <p className="text-xs font-medium">Send Withdraw Request</p>
        </button>

        {/* Offline Recharge Wallet */}
        <button
          onClick={() => setShowRechargeModal(true)}
          className="bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-xl p-5 text-center hover:shadow-lg transition-shadow"
        >
          <div className="size-10 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Plus className="size-5" />
          </div>
          <p className="text-xs font-medium">Offline Recharge Wallet</p>
        </button>

        {/* Guarantee Recharge */}
        <button
          onClick={() => setShowGuaranteeModal(true)}
          className="bg-gradient-to-br from-green-400 to-green-500 text-white rounded-xl p-5 text-center hover:shadow-lg transition-shadow"
        >
          <div className="size-10 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Shield className="size-5" />
          </div>
          <p className="text-xs font-medium">Guarantee Recharge</p>
        </button>
      </div>

      {/* ── Withdraw Request History ── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Withdraw Request history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Withdraw Type</th>
                <th className="text-left px-4 py-3 font-medium">Remarks</th>
                <th className="text-left px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="size-8 animate-spin text-sky-400 mx-auto" /></td></tr>
              ) : (data?.history ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Frown className="size-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-500 font-medium">Nothing found</p>
                  </td>
                </tr>
              ) : (
                (data?.history ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{item.index}</td>
                    <td className="px-4 py-3 text-gray-600">{item.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">${item.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{item.type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.withdraw_type}</td>
                    <td className="px-4 py-3 text-gray-600">{item.remarks || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{item.message || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Froze Order ── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Froze Order</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Order Code:</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Profit</th>
                <th className="text-left px-4 py-3 font-medium">Payment Status</th>
                <th className="text-left px-4 py-3 font-medium">Pick Up Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Unfreeze Countdown</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="size-8 animate-spin text-sky-400 mx-auto" /></td></tr>
              ) : (data?.frozeOrders ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Frown className="size-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No frozen orders</p>
                  </td>
                </tr>
              ) : (
                (data?.frozeOrders ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{item.index}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.order_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">${item.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">${item.profit.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.payment_status] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.pickup_status] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.pickup_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.date}</td>
                    <td className="px-4 py-3 text-gray-600">{item.unfreeze_countdown}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════ MODAL: Send Withdraw Request ═══════ */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowWithdrawModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowWithdrawModal(false)} className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100"><X className="size-4" /></button>
            <h3 className="text-lg font-bold mb-4">Send A Withdraw Request</h3>

            {/* Balances */}
            <div className="space-y-2 mb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm font-medium text-amber-800">
                Your wallet balance : ${walletMoney.toFixed(2)}
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 text-sm font-medium text-teal-800">
                Your guarantee balance : ${guaranteeMoney.toFixed(2)}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Amount *</Label>
                <Input type="number" min="1" step="0.01" placeholder="Amount" value={wAmount} onChange={(e) => setWAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Opera Type</Label>
                <select value={wOperaType} onChange={(e) => setWOperaType(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-sky-500 outline-none">
                  <option>User Balance</option>
                  <option>Guarantee Balance</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">Withdraw Type</Label>
                <select value={wWithdrawType} onChange={(e) => setWWithdrawType(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-sky-500 outline-none">
                  <option>Bank</option>
                  <option>Usdt</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">Message</Label>
                <textarea value={wMessage} onChange={(e) => setWMessage(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-sky-500 outline-none resize-y" />
              </div>
              <Button onClick={handleWithdraw} disabled={wSubmitting} className="w-full bg-sky-500 hover:bg-sky-600 text-white">
                {wSubmitting ? <><Loader2 className="size-4 animate-spin mr-2" />Sending...</> : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: Offline Recharge Wallet ═══════ */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowRechargeModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowRechargeModal(false)} className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100"><X className="size-4" /></button>
            <h3 className="text-lg font-bold mb-4">Offline Recharge Wallet</h3>

            {/* Payment Method Selector */}
            <div className="flex gap-4 mb-4">
              {[
                { key: "USDT - TRC20", label: "USDT - TRC20", icon: "💰" },
                { key: "Bank", label: "Bank", icon: "🏦" },
              ].map((pm) => (
                <button
                  key={pm.key}
                  onClick={() => setRSelectedMethod(pm.key)}
                  className={`flex-1 border-2 rounded-xl p-4 text-center transition-colors ${rSelectedMethod === pm.key ? "border-sky-500 bg-sky-50" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <span className="text-4xl block mb-2">{pm.icon}</span>
                  <p className="text-sm font-medium text-gray-700">{pm.label}</p>
                </button>
              ))}
            </div>

            {/* Bank info */}
            {data?.bankInfo && rSelectedMethod === "Bank" && (
              <ul className="text-sm text-gray-600 mb-4 space-y-1 list-disc pl-5">
                <li>Bank Name - {data.bankInfo.bank_name || "-"}, Account Name - {data.bankInfo.account_name || "-"}, Account Number - {data.bankInfo.account_number || "-"}, Routing Number - {data.bankInfo.routing_number || "-"}</li>
              </ul>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Amount *</Label>
                <Input type="number" min="1" step="0.01" placeholder="Amount" value={rAmount} onChange={(e) => setRAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Photo *</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => rFileRef.current?.click()}>
                    Browse
                  </Button>
                  <span className="text-sm text-gray-500 truncate">{rPhoto?.name || "Choose image"}</span>
                  <input ref={rFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setRPhoto(e.target.files?.[0] ?? null)} />
                </div>
              </div>
              <Button onClick={handleRecharge} disabled={rSubmitting} className="w-full bg-sky-500 hover:bg-sky-600 text-white">
                {rSubmitting ? <><Loader2 className="size-4 animate-spin mr-2" />Submitting...</> : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: Guarantee Recharge ═══════ */}
      {showGuaranteeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowGuaranteeModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowGuaranteeModal(false)} className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100"><X className="size-4" /></button>
            <h3 className="text-lg font-bold mb-4">Guarantee Recharge</h3>

            <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 text-sm font-medium text-teal-800 mb-4">
              Current guarantee balance: ${guaranteeMoney.toFixed(2)}
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Amount *</Label>
                <Input type="number" min="1" step="0.01" placeholder="Amount" value={gAmount} onChange={(e) => setGAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Photo (optional)</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => gFileRef.current?.click()}>
                    <Upload className="size-3.5 mr-1" /> Browse
                  </Button>
                  <span className="text-sm text-gray-500 truncate">{gPhoto?.name || "Choose image"}</span>
                  <input ref={gFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setGPhoto(e.target.files?.[0] ?? null)} />
                </div>
              </div>
              <Button onClick={handleGuarantee} disabled={gSubmitting} className="w-full bg-green-500 hover:bg-green-600 text-white">
                {gSubmitting ? <><Loader2 className="size-4 animate-spin mr-2" />Submitting...</> : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}