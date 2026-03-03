"use client";

import { useState } from "react";
import { CreditCard, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";

type Gateway = {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  sandbox: boolean;
  config: Record<string, string>;
};

const defaultGateways: Gateway[] = [
  {
    id: "stripe",
    name: "Stripe",
    provider: "stripe",
    is_active: true,
    sandbox: true,
    config: { publishable_key: "", secret_key: "", webhook_secret: "" },
  },
  {
    id: "paypal",
    name: "PayPal",
    provider: "paypal",
    is_active: false,
    sandbox: true,
    config: { client_id: "", client_secret: "" },
  },
  {
    id: "cod",
    name: "Cash on Delivery",
    provider: "cod",
    is_active: true,
    sandbox: false,
    config: {},
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    provider: "bank_transfer",
    is_active: false,
    sandbox: false,
    config: { bank_name: "", account_name: "", account_number: "", routing_number: "" },
  },
];

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>(defaultGateways);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setGateways((prev) => prev.map((g) => (g.id === id ? { ...g, is_active: !g.is_active } : g)));
  };

  const updateConfig = (id: string, key: string, value: string) => {
    setGateways((prev) =>
      prev.map((g) => (g.id === id ? { ...g, config: { ...g.config, [key]: value } } : g))
    );
  };

  const toggleSandbox = (id: string) => {
    setGateways((prev) => prev.map((g) => (g.id === id ? { ...g, sandbox: !g.sandbox } : g)));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Payment Gateways</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure payment processing methods</p>
      </div>

      <div className="space-y-4">
        {gateways.map((gw) => (
          <div key={gw.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gw.is_active ? "bg-indigo-50" : "bg-gray-50"}`}>
                  <CreditCard className={`size-5 ${gw.is_active ? "text-indigo-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{gw.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gw.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {gw.is_active ? "Active" : "Inactive"}
                    </span>
                    {gw.sandbox && gw.provider !== "cod" && gw.provider !== "bank_transfer" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Sandbox</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(gw.id)} className={`relative w-11 h-6 rounded-full transition-colors ${gw.is_active ? "bg-indigo-600" : "bg-gray-200"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${gw.is_active ? "left-[22px]" : "left-0.5"}`} />
                </button>
                {Object.keys(gw.config).length > 0 && (
                  <button onClick={() => setEditingId(editingId === gw.id ? null : gw.id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"><Settings className="size-4" /></button>
                )}
              </div>
            </div>

            {editingId === gw.id && Object.keys(gw.config).length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
                {gw.provider !== "cod" && gw.provider !== "bank_transfer" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={gw.sandbox} onChange={() => toggleSandbox(gw.id)} />
                    Sandbox / Test Mode
                  </label>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(gw.config).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">{key.replace(/_/g, " ")}</label>
                      <Input type={key.includes("secret") || key.includes("key") ? "password" : "text"} value={value} onChange={(e) => updateConfig(gw.id, key, e.target.value)} placeholder={`Enter ${key.replace(/_/g, " ")}`} />
                    </div>
                  ))}
                </div>
                <button disabled className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed">Save Configuration (API Pending)</button>
                <p className="text-xs text-amber-600">Note: Gateway configuration persistence requires a settings API endpoint.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
