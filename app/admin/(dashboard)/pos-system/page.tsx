/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, RefreshCw, Package, CheckCircle } from "lucide-react";
type POSProduct = { id: string; title: string; price: number; stock_quantity: number; image_url: string | null; sku: string | null };
type CartItem = POSProduct & { qty: number };
export default function POSSystemPage() {
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchProducts = async (q: string) => {
    if (!q.trim()) { setProducts([]); return; }
    setLoading(true);
    try { const r = await fetch("/api/admin/pos?search=" + encodeURIComponent(q)); const j = await r.json(); setProducts(j.products || []); } catch {} finally { setLoading(false); }
  };
  const handleSearch = (v: string) => {
    setSearch(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => searchProducts(v), 300);
  };
  const addToCart = (p: POSProduct) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === p.id);
      if (ex) return prev.map((c) => c.id === p.id ? { ...c, qty: Math.min(c.qty + 1, p.stock_quantity) } : c);
      return [...prev, { ...p, qty: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: Math.max(1, Math.min(c.qty + delta, c.stock_quantity)) } : c).filter((c) => c.qty > 0));
  };
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const r = await fetch("/api/admin/pos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.map((c) => ({ product_id: c.id, qty: c.qty, price: c.price })) }) });
      if (r.ok) { setSuccess(true); setCart([]); setSearch(""); setProducts([]); setTimeout(() => setSuccess(false), 3000); }
    } catch {} finally { setPlacing(false); }
  };
  useEffect(() => { return () => { if (timer.current) clearTimeout(timer.current); }; }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2 text-emerald-700 text-sm font-medium"><CheckCircle className="size-4" /> Order placed successfully!</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-indigo-400">
              <Search className="size-4 text-gray-400 shrink-0" />
              <input type="text" placeholder="Search products by name or SKU…" value={search} onChange={(e) => handleSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full" />
              {loading && <RefreshCw className="size-4 animate-spin text-gray-400 shrink-0" />}
            </div>
          </div>
          {products.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock_quantity === 0} className="flex flex-col items-start gap-2 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-24 object-cover rounded-lg border border-gray-100" /> : <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center"><Package className="size-6 text-gray-300" /></div>}
                    <div><p className="text-xs font-medium text-gray-800 line-clamp-2">{p.title}</p><p className="text-sm font-bold text-indigo-600 mt-1">{Number(p.price).toFixed(2)}</p><p className="text-[11px] text-gray-400">{p.stock_quantity} in stock</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {products.length === 0 && search && !loading && <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-12 text-gray-400 gap-2"><Package className="size-8 opacity-30" /><p className="text-sm">No products found</p></div>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-fit">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2"><ShoppingCart className="size-4 text-indigo-500" /><span className="text-sm font-semibold text-gray-800">Cart</span>{cart.length > 0 && <span className="ml-auto text-xs bg-indigo-600 text-white rounded-full px-2 py-0.5 font-semibold">{cart.reduce((s,c)=>s+c.qty,0)}</span>}</div>
          {cart.length === 0 ? <div className="flex flex-col items-center justify-center py-10 text-gray-300 gap-2"><ShoppingCart className="size-8" /><p className="text-xs">Cart is empty</p></div>
          : <div className="flex flex-col">
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">{cart.map((item) => (<div key={item.id} className="flex items-center gap-3 px-4 py-3"><div className="flex-1 min-w-0"><p className="text-xs font-medium text-gray-800 truncate">{item.title}</p><p className="text-xs text-indigo-600 font-bold mt-0.5">{(item.price*item.qty).toFixed(2)}</p></div><div className="flex items-center gap-1 shrink-0"><button onClick={()=>updateQty(item.id,-1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Minus className="size-3 text-gray-600"/></button><span className="text-xs font-semibold text-gray-800 w-6 text-center">{item.qty}</span><button onClick={()=>updateQty(item.id,1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Plus className="size-3 text-gray-600"/></button><button onClick={()=>removeFromCart(item.id)} className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center ml-1"><Trash2 className="size-3 text-red-400"/></button></div></div>))}</div>
            <div className="px-4 py-3 border-t border-gray-50 space-y-1.5"><div className="flex items-center justify-between text-xs text-gray-500"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div><div className="flex items-center justify-between text-xs text-gray-500"><span>Tax (8%)</span><span>{tax.toFixed(2)}</span></div><div className="flex items-center justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>{total.toFixed(2)}</span></div></div>
            <div className="px-4 pb-4"><button onClick={placeOrder} disabled={placing} className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">{placing ? <><RefreshCw className="size-4 animate-spin"/>Processing…</> : <>Place Walk-in Order</>}</button></div>
          </div>}
        </div>
      </div>
    </div>
  );
}
