/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, Package, ChevronDown, Barcode, Plus, Minus, X, CheckCircle } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type Shop = { id: string; name: string };
type Category = { id: string; name: string };
type Brand = { id: string; name: string };
type POSProduct = {
  id: string; title: string; price: number; stock_count: number;
  image_url: string | null; sku: string | null;
  shops: { id: string; name: string } | null;
  categories: { id: string; name: string } | null;
  brands: { id: string; name: string } | null;
};
type CartItem = POSProduct & { qty: number };
type Customer = { id: string; full_name: string; phone: string | null };
type Address = {
  id: string; label: string | null; full_name: string; phone: string | null;
  line_1: string; line_2: string | null; city: string; state: string | null;
  postal_code: string | null; country: string; is_default: boolean;
};

const WALK_IN: Customer = { id: "__walkin__", full_name: "Walk In Customer", phone: null };

// ─── Sub-components ─────────────────────────────────────────────────────────

function FilterSelect({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-10 pl-3 pr-8 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 cursor-pointer min-w-[130px]"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

function CustomerSelect({
  customers, selected, onSelect,
}: {
  customers: Customer[]; selected: Customer; onSelect: (c: Customer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = [WALK_IN, ...customers].filter((c) => c.full_name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div ref={ref} className="relative flex-1">
      <div onClick={() => setOpen((o) => !o)} className={`flex items-center justify-between h-10 px-3 rounded-lg border cursor-pointer text-sm transition-all ${open ? "border-orange-400 ring-1 ring-orange-200" : "border-gray-200"} bg-white`}>
        <span className="text-gray-700 truncate">{selected.full_name}</span>
        <ChevronDown className="size-3.5 text-gray-400 shrink-0 ml-1" />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer…" className="bg-transparent text-xs text-gray-700 outline-none w-full" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((c) => (
              <div key={c.id} onClick={() => { onSelect(c); setOpen(false); setSearch(""); }} className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${selected.id === c.id ? "bg-orange-500 text-white" : "text-gray-700 hover:bg-gray-50"}`}>
                {c.full_name}
              </div>
            ))}
            {filtered.length === 0 && <div className="px-4 py-4 text-xs text-gray-400 text-center">No customers found</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function ShippingModal({ customer, addresses, selectedId, onSelect, onAddNew, onClose, onConfirm, loading }: {
  customer: Customer; addresses: Address[]; selectedId: string | null;
  onSelect: (id: string) => void; onAddNew: () => void;
  onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Shipping address</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="size-4 text-gray-500" /></button>
        </div>
        <div className="p-4 max-h-72 overflow-y-auto space-y-2">
          {addresses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No addresses found for {customer.full_name}</p>
          ) : addresses.map((addr) => (
            <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedId === addr.id ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200 hover:border-gray-300"}`}>
              <input type="radio" name="address" checked={selectedId === addr.id} onChange={() => onSelect(addr.id)} className="mt-0.5 accent-indigo-600" />
              <div className="text-xs text-gray-600 space-y-0.5 leading-relaxed">
                <div><span className="text-gray-500">Address:</span> {addr.line_1}{addr.line_2 ? `, ${addr.line_2}` : ""}</div>
                {addr.postal_code && <div><span className="text-gray-500">Postal code:</span> {addr.postal_code}</div>}
                <div><span className="text-gray-500">City:</span> {addr.city}</div>
                {addr.state && <div><span className="text-gray-500">State:</span> {addr.state}</div>}
                <div><span className="text-gray-500">Country:</span> {addr.country}</div>
                {addr.phone && <div><span className="text-gray-500">Phone:</span> {addr.phone}</div>}
              </div>
            </label>
          ))}
        </div>
        <div className="px-4 pb-2">
          <button onClick={onAddNew} className="w-full py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Add New Address</button>
        </div>
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Close</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
            {loading ? <RefreshCw className="size-4 animate-spin" /> : null} Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderSummaryModal({ cart, customer, addresses, selectedAddressId, shipping, discount, tax, subtotal, total, onClose, onPayment }: {
  cart: CartItem[]; customer: Customer; addresses: Address[];
  selectedAddressId: string | null; shipping: number; discount: number;
  tax: number; subtotal: number; total: number;
  onClose: () => void; onPayment: (method: "offline" | "cod" | "cash") => void;
}) {
  const addr = addresses.find((a) => a.id === selectedAddressId) || addresses[0] || null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Order Summary</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="size-4 text-gray-500" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                  {item.image_url ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="size-6 text-gray-300" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">QTY: {item.qty}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 shrink-0">${(item.price * item.qty).toFixed(2)}</p>
              </div>
            ))}
          </div>
          {customer.id !== WALK_IN.id && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Customer Info</h3>
              <div className="space-y-1.5">
                {[
                  ["Name", customer.full_name],
                  customer.phone ? ["Phone", customer.phone] : null,
                  addr ? ["Address", `${addr.line_1}${addr.line_2 ? `, ${addr.line_2}` : ""}`] : null,
                  addr ? ["Country", addr.country] : null,
                  addr ? ["City", addr.city] : null,
                  addr?.postal_code ? ["Postal code", addr.postal_code] : null,
                ].filter(Boolean).map((row) => row && (
                  <div key={row[0]} className="flex items-baseline justify-between text-sm gap-4">
                    <span className="text-gray-500 shrink-0">{row[0]}:</span>
                    <span className="text-gray-800 font-medium text-right">{row[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {[["Total", `$${subtotal.toFixed(2)}`], ["Tax", `$${tax.toFixed(2)}`], ["Shipping", `$${shipping.toFixed(2)}`], ["Discount", `$${discount.toFixed(2)}`]].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between text-sm text-gray-600"><span>{label}</span><span>{val}</span></div>
            ))}
            <div className="flex items-center justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 flex-wrap">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-white bg-gray-400 rounded-xl hover:bg-gray-500 transition-colors">Close</button>
          <button onClick={() => onPayment("offline")} className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>Offline payment</button>
          <button onClick={() => onPayment("cod")} className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors" style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}>Confirm with COD</button>
          <button onClick={() => onPayment("cash")} className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>Confirm with Cash</button>
        </div>
      </div>
    </div>
  );
}

function AddAddressModal({ customerId, onClose, onAdded }: { customerId: string; onClose: () => void; onAdded: (addr: Address) => void }) {
  const [form, setForm] = useState({ full_name: "", phone: "", line_1: "", line_2: "", city: "", state: "", postal_code: "", country: "", label: "", is_default: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!form.full_name || !form.line_1 || !form.city || !form.country) { setErr("Name, address line, city and country are required."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/admin/pos/customers/${customerId}/addresses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error || "Failed to save"); return; }
      onAdded(json.address);
    } catch { setErr("Network error"); } finally { setSaving(false); }
  };
  const F = (label: string, key: keyof typeof form, req?: boolean) => (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}{req && " *"}</label>
      <input value={form[key] as string} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Add New Address</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="size-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          {F("Full Name", "full_name", true)} {F("Phone", "phone")} {F("Address Line 1", "line_1", true)} {F("Address Line 2", "line_2")} {F("City", "city", true)} {F("State", "state")} {F("Postal Code", "postal_code")} {F("Country", "country", true)} {F("Label (e.g. Home, Work)", "label")}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            {saving ? <RefreshCw className="size-4 animate-spin" /> : null} Save Address
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── Main POS Page ─────────────────────────────────────────────────────────
export default function POSManagerPage() {
  const [search, setSearch] = useState("");
  const [shopId, setShopId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");

  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [products, setProducts] = useState<POSProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>(WALK_IN);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const [shippingInput, setShippingInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [showShippingInput, setShowShippingInput] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const [modal, setModal] = useState<"shipping" | "summary" | "addAddress" | null>(null);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/shops?limit=200").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/brands").then((r) => r.json()),
      fetch("/api/admin/pos/customers").then((r) => r.json()),
    ]).then(([s, c, b, cu]) => {
      setShops((s.items || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      setCategories((c.items || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      setBrands((b.items || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      setCustomers(cu.customers || []);
    }).catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (shopId) params.set("shop_id", shopId);
      if (categoryId) params.set("category_id", categoryId);
      if (brandId) params.set("brand_id", brandId);
      const res = await fetch("/api/admin/pos?" + params.toString());
      const json = await res.json();
      setProducts(json.products || []);
    } catch { setProducts([]); } finally { setProductsLoading(false); }
  }, [search, shopId, categoryId, brandId]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(loadProducts, search ? 300 : 0);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [loadProducts, search]);

  useEffect(() => {
    setAddresses([]); setSelectedAddressId(null);
    if (customer.id === WALK_IN.id) return;
    setAddressesLoading(true);
    fetch(`/api/admin/pos/customers/${customer.id}/addresses`)
      .then((r) => r.json()).then((j) => {
        const addrs: Address[] = j.addresses || [];
        setAddresses(addrs);
        const def = addrs.find((a) => a.is_default);
        setSelectedAddressId(def?.id || addrs[0]?.id || null);
      }).catch(() => {}).finally(() => setAddressesLoading(false));
  }, [customer]);

  const addToCart = (p: POSProduct) => {
    if (p.stock_count <= 0) return;
    setCart((prev) => {
      const ex = prev.find((c) => c.id === p.id);
      if (ex) return prev.map((c) => c.id === p.id ? { ...c, qty: Math.min(c.qty + 1, p.stock_count) } : c);
      return [...prev, { ...p, qty: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: Math.max(1, Math.min(c.qty + delta, c.stock_count)) } : c).filter((c) => c.qty > 0));
  };
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));
  const clearCart = () => { setCart([]); setShippingInput(""); setDiscountInput(""); };

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = 0;
  const shipping = parseFloat(shippingInput) || 0;
  const discount = parseFloat(discountInput) || 0;
  const total = Math.max(0, subtotal + tax + shipping - discount);

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    if (customer.id !== WALK_IN.id && addresses.length > 0) setModal("shipping");
    else setModal("summary");
  };

  const handlePayment = async (method: "offline" | "cod" | "cash") => {
    setPlacing(true);
    try {
      const res = await fetch("/api/admin/pos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ product_id: c.id, seller_id: c.shops?.id || null, quantity: c.qty, unit_price: c.price })),
          customer_id: customer.id === WALK_IN.id ? undefined : customer.id,
          shipping_address_id: selectedAddressId || undefined,
          shipping_fee: shipping, discount_amount: discount, payment_method: method,
        }),
      });
      if (res.ok) { setSuccess(true); clearCart(); setCustomer(WALK_IN); setModal(null); setTimeout(() => setSuccess(false), 4000); }
    } catch {} finally { setPlacing(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden -m-5 md:-m-6">
      {success && (
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-5 py-3">
          <CheckCircle className="size-4 shrink-0" /> Order placed successfully!
        </div>
      )}
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-10 bg-white focus-within:border-indigo-400 min-w-[200px] flex-1 max-w-xs">
          <Search className="size-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search by Product Name/ID" value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full bg-transparent" />
          {productsLoading && <RefreshCw className="size-3.5 animate-spin text-gray-400 shrink-0" />}
        </div>
        <FilterSelect value={shopId} onChange={setShopId} options={shops.map((s) => ({ value: s.id, label: s.name }))} placeholder="All Shops" />
        <FilterSelect value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="All Categories" />
        <FilterSelect value={brandId} onChange={setBrandId} options={brands.map((b) => ({ value: b.id, label: b.name }))} placeholder="All Brands" />
        <div className="ml-auto flex items-center gap-2">
          <CustomerSelect customers={customers} selected={customer} onSelect={setCustomer} />
          <button onClick={loadProducts} className="h-10 w-10 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0" title="Refresh products">
            <Barcode className="size-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 gap-2"><RefreshCw className="size-5 animate-spin" /><span className="text-sm">Loading products…</span></div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2"><Package className="size-10 opacity-30" /><p className="text-sm font-medium">No products found</p><p className="text-xs">Try adjusting filters or search</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {products.map((p) => {
                const inCart = cart.find((c) => c.id === p.id);
                return (
                  <div key={p.id} onClick={() => addToCart(p)}
                    className={`relative flex flex-col bg-white rounded-xl border cursor-pointer transition-all overflow-hidden group ${p.stock_count <= 0 ? "opacity-50 cursor-not-allowed border-gray-100" : inCart ? "border-indigo-300 shadow-md" : "border-gray-100 hover:border-indigo-200 hover:shadow-sm"}`}>
                    <div className="absolute top-0 left-0 z-10 text-white text-[10px] font-bold px-2 py-1 rounded-br-xl" style={{ background: p.stock_count > 0 ? "linear-gradient(135deg,#10b981,#059669)" : "#ef4444" }}>
                      In stock : {p.stock_count}
                    </div>
                    {inCart && <div className="absolute top-0 right-0 z-10 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl">×{inCart.qty}</div>}
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><Package className="size-8 text-gray-200" /></div>}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight">{p.title}</p>
                      <p className="text-xs font-bold text-gray-900 mt-1">${Number(p.price).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div className="w-72 xl:w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2 py-16">
                <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-xs text-gray-400">Add products to cart</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cart.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                        {item.image_url ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="size-4 text-gray-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-snug">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.qty} × ${Number(item.price).toFixed(2)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-gray-900">${(item.price * item.qty).toFixed(2)}</p>
                        <button onClick={() => removeFromCart(item.id)} className="mt-0.5 text-[10px] text-red-400 hover:text-red-600 transition-colors">remove</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"><Minus className="size-3 text-gray-600" /></button>
                      <span className="text-xs font-semibold text-gray-800 w-8 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"><Plus className="size-3 text-gray-600" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 px-4 py-3 shrink-0 space-y-1.5">
            {[["Sub Total", `$${subtotal.toFixed(2)}`], ["Tax", `$${tax.toFixed(2)}`], ["Shipping", `$${shipping.toFixed(2)}`], ["Discount", `$${discount.toFixed(2)}`]].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between text-xs text-gray-500"><span>{label}</span><span>{val}</span></div>
            ))}
            <div className="flex items-center justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-200"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          {/* Shipping/Discount expandable */}
          {(showShippingInput || showDiscountInput) && (
            <div className="px-4 pb-2 space-y-2">
              {showShippingInput && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-16 shrink-0">Shipping:</label>
                  <input type="number" min="0" step="0.01" value={shippingInput} onChange={(e) => setShippingInput(e.target.value)} placeholder="0.00" className="flex-1 h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400" />
                </div>
              )}
              {showDiscountInput && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-16 shrink-0">Discount:</label>
                  <input type="number" min="0" step="0.01" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0.00" className="flex-1 h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400" />
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="px-4 pb-4 space-y-2 shrink-0">
            <div className="flex gap-2">
              <button onClick={() => setShowShippingInput((v) => !v)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Shipping <span className="text-gray-400">{showShippingInput ? "▼" : "▲"}</span>
              </button>
              <button onClick={() => setShowDiscountInput((v) => !v)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Discount <span className="text-gray-400">{showDiscountInput ? "▼" : "▲"}</span>
              </button>
            </div>
            <button onClick={handlePlaceOrder} disabled={cart.length === 0 || placing} className="w-full py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
              {placing ? <RefreshCw className="size-4 animate-spin" /> : null} Place Order
            </button>
          </div>
        </div>
      </div>

      {/* Shipping Modal */}
      {modal === "shipping" && (
        <ShippingModal customer={customer} addresses={addresses} selectedId={selectedAddressId} onSelect={setSelectedAddressId} onAddNew={() => setModal("addAddress")} onClose={() => setModal(null)} onConfirm={() => setModal("summary")} loading={addressesLoading} />
      )}

      {/* Order Summary Modal */}
      {modal === "summary" && (
        <OrderSummaryModal cart={cart} customer={customer} addresses={addresses} selectedAddressId={selectedAddressId} shipping={shipping} discount={discount} tax={tax} subtotal={subtotal} total={total} onClose={() => setModal(null)} onPayment={handlePayment} />
      )}

      {/* Add Address Modal */}
      {modal === "addAddress" && customer.id !== WALK_IN.id && (
        <AddAddressModal customerId={customer.id} onClose={() => setModal("shipping")} onAdded={(addr) => { setAddresses((prev) => [...prev, addr]); setSelectedAddressId(addr.id); setModal("shipping"); }} />
      )}
    </div>
  );
}
