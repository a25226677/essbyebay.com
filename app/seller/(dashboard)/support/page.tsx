"use client";

import { useEffect, useState } from "react";
import { PlusCircle, Search, Frown, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Ticket = {
  id: string;
  index: number;
  subject: string;
  message: string;
  status: string;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusColors: Record<string, string> = {
  open: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function SupportTicketPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/support", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setTickets(json.tickets ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTickets(); }, []);

  async function handleSubmit() {
    if (!subject.trim() || !details.trim()) {
      setError("Subject and message are required");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/seller/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message: details }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submit failed");
      setSuccess("Ticket submitted successfully!");
      setSubject("");
      setDetails("");
      setShowForm(false);
      await loadTickets();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = search
    ? tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          t.id.toLowerCase().includes(search.toLowerCase()),
      )
    : tickets;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Support Tickets</h1>
        <Button
          className="bg-sky-500 hover:bg-sky-600 text-white"
          onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
        >
          <PlusCircle className="size-4 mr-1" />
          New Ticket
        </Button>
      </div>

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

      {/* New Ticket Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Create New Ticket</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="size-4" />
            </button>
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Subject</Label>
            <Input
              placeholder="Ticket subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Details</Label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm resize-none outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Describe your issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              {submitting ? <><Loader2 className="size-4 animate-spin mr-2" />Submitting...</> : "Submit Ticket"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            All Tickets {!loading && <span className="text-gray-400 font-normal">({tickets.length})</span>}
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Ticket ID</th>
                <th className="text-left px-4 py-3 font-medium">Subject</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="size-8 animate-spin text-sky-400 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Frown className="size-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-500 font-medium">No support tickets</p>
                  </td>
                </tr>
              ) : (
                filtered.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{ticket.index}</td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-600">{ticket.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-[240px] truncate">{ticket.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColors[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{ticket.createdAt}</td>
                    <td className="px-4 py-3 text-gray-500">{ticket.updatedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
