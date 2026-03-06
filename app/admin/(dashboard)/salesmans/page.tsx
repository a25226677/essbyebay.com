"use client";

import { useState } from "react";
import { Search, Plus, DollarSign, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Salesman = {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedSeller: string;
  sales: number;
  commission: number;
  earnings: string;
  joined: string;
  status: string;
};

const initialSalesmans: Salesman[] = [
  { id: "SM001", name: "Alex Turner", email: "alex.t@company.com", phone: "+1 234-111-2222", assignedSeller: "Tech Store", sales: 82, commission: 5, earnings: "$623.00", joined: "Feb 2025", status: "Active" },
  { id: "SM002", name: "Jordan Lee", email: "jordan.l@company.com", phone: "+1 234-111-3333", assignedSeller: "Fashion Hub", sales: 55, commission: 6, earnings: "$394.20", joined: "Apr 2025", status: "Active" },
  { id: "SM003", name: "Casey Brown", email: "casey.b@company.com", phone: "+1 234-111-4444", assignedSeller: "Sports Plus", sales: 31, commission: 5, earnings: "$215.75", joined: "Jul 2025", status: "Active" },
  { id: "SM004", name: "Morgan White", email: "morgan.w@company.com", phone: "+1 234-111-5555", assignedSeller: "Home Essentials", sales: 0, commission: 5, earnings: "$0.00", joined: "Jan 2026", status: "Inactive" },
];

export default function SalesmansPage() {
  const [salesmans, setSalesmans] = useState<Salesman[]>(initialSalesmans);
  const [search, setSearch] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<Salesman | null>(null);
  const [payItem, setPayItem] = useState<Salesman | null>(null);
  const [payAmount, setPayAmount] = useState("");

  // Add/Edit form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSeller, setFormSeller] = useState("");
  const [formCommission, setFormCommission] = useState("5");
  const [formStatus, setFormStatus] = useState("Active");

  const filtered = salesmans.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.assignedSeller.toLowerCase().includes(search.toLowerCase())
  );

  const totalEarnings = salesmans.reduce((sum, s) => sum + parseFloat(s.earnings.replace("$", "").replace(",", "")), 0);

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormPhone("");
    setFormSeller(""); setFormCommission("5"); setFormStatus("Active");
  };

  const openAdd = () => { resetForm(); setShowAddModal(true); };
  const openEdit = (s: Salesman) => {
    setEditItem(s);
    setFormName(s.name); setFormEmail(s.email); setFormPhone(s.phone);
    setFormSeller(s.assignedSeller); setFormCommission(String(s.commission)); setFormStatus(s.status);
  };

  const handleAdd = () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    const newId = `SM${String(salesmans.length + 1).padStart(3, "0")}`;
    const now = new Date();
    const joined = now.toLocaleString("default", { month: "short" }) + " " + now.getFullYear();
    setSalesmans(prev => [...prev, {
      id: newId, name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim(),
      assignedSeller: formSeller.trim() || "Unassigned", sales: 0,
      commission: parseInt(formCommission) || 5, earnings: "$0.00", joined, status: formStatus,
    }]);
    setShowAddModal(false);
    resetForm();
    toast.success("Salesman added successfully");
  };

  const handleEdit = () => {
    if (!editItem || !formName.trim()) return;
    setSalesmans(prev => prev.map(s => s.id === editItem.id ? {
      ...s, name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim(),
      assignedSeller: formSeller.trim() || s.assignedSeller,
      commission: parseInt(formCommission) || s.commission, status: formStatus,
    } : s));
    setEditItem(null);
    resetForm();
    toast.success("Salesman updated successfully");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this salesman?")) return;
    setSalesmans(prev => prev.filter(s => s.id !== id));
    toast.success("Salesman deleted");
  };

  const handlePay = () => {
    if (!payItem) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSalesmans(prev => prev.map(s => {
      if (s.id !== payItem.id) return s;
      const currentEarnings = parseFloat(s.earnings.replace("$", "").replace(",", ""));
      return { ...s, earnings: `$${(currentEarnings + amt).toFixed(2)}` };
    }));
    toast.success(`$${amt.toFixed(2)} commission paid to ${payItem.name}`);
    setPayItem(null);
    setPayAmount("");
  };

  const toggleStatus = (id: string) => {
    setSalesmans(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "Active" ? "Inactive" : "Active" } : s));
    toast.success("Status updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Salesmans</h1>
        <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="size-4" /> Add Salesman</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Salesmans", value: salesmans.length },
          { label: "Active", value: salesmans.filter(s => s.status === "Active").length },
          { label: "Total Commissions Paid", value: `$${totalEarnings.toFixed(2)}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input placeholder="Search salesmans..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-3 text-left">Salesman</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Assigned Seller</th>
                <th className="px-4 py-3 text-right">Total Sales</th>
                <th className="px-4 py-3 text-right">Commission %</th>
                <th className="px-4 py-3 text-right">Earnings</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No salesmans found</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                        <p className="text-[10px] text-gray-400">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600">{s.email}</p>
                    <p className="text-[10px] text-gray-400">{s.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-indigo-600">{s.assignedSeller}</td>
                  <td className="px-4 py-3 text-xs text-right font-semibold">{s.sales}</td>
                  <td className="px-4 py-3 text-xs text-right text-blue-600 font-semibold">{s.commission}%</td>
                  <td className="px-4 py-3 text-xs text-right font-semibold text-green-700">{s.earnings}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.joined}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(s.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer ${s.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.status}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)}
                        className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-0.5">
                        <Pencil className="size-2.5" />Edit
                      </button>
                      <button onClick={() => { setPayItem(s); setPayAmount(""); }}
                        className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center gap-0.5">
                        <DollarSign className="size-2.5" />Pay
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center gap-0.5">
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Salesman Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Add Salesman</h2>
              <button onClick={() => setShowAddModal(false)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div><Label className="text-xs">Name *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Full name" className="mt-1" /></div>
              <div><Label className="text-xs">Email *</Label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="Email" className="mt-1" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Phone number" className="mt-1" /></div>
              <div><Label className="text-xs">Assigned Seller</Label><Input value={formSeller} onChange={e => setFormSeller(e.target.value)} placeholder="Shop name" className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Commission %</Label><Input type="number" min="0" max="100" value={formCommission} onChange={e => setFormCommission(e.target.value)} className="mt-1" /></div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="Active">Active</option><option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd}>Add Salesman</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salesman Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Edit Salesman</h2>
              <button onClick={() => { setEditItem(null); resetForm(); }}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div><Label className="text-xs">Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Email</Label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Assigned Seller</Label><Input value={formSeller} onChange={e => setFormSeller(e.target.value)} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Commission %</Label><Input type="number" min="0" max="100" value={formCommission} onChange={e => setFormCommission(e.target.value)} className="mt-1" /></div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="Active">Active</option><option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => { setEditItem(null); resetForm(); }}>Cancel</Button>
              <Button size="sm" onClick={handleEdit}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Commission Modal */}
      {payItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Pay Commission</h2>
              <button onClick={() => setPayItem(null)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                <p>Salesman: <span className="font-semibold text-gray-800">{payItem.name}</span></p>
                <p className="mt-1">Current earnings: <span className="font-bold text-green-600">{payItem.earnings}</span></p>
                <p className="mt-0.5">Commission rate: <span className="font-semibold text-blue-600">{payItem.commission}%</span></p>
              </div>
              <div>
                <Label className="text-xs">Payment Amount (USD)</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input type="number" min="0.01" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" className="pl-8" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setPayItem(null)}>Cancel</Button>
              <Button size="sm" onClick={handlePay} className="bg-green-600 hover:bg-green-700">Pay Commission</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
