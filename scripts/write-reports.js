const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "..");
function write(relPath, content) {
  const full = path.join(base, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("Written:", relPath);
}

// ─── API: Reports ────────────────────────────────────────────────────────────
write("app/api/admin/reports/inhouse-sale/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id") || "";
    let query = db.from("products").select("id, name, category_id, categories!products_category_id_fkey(name)", { count: "exact" })
      .eq("is_active", true);
    if (categoryId) query = query.eq("category_id", categoryId);
    query = query.order("name");
    const { data: products, error, count } = await query;
    if (error) throw error;
    // Get order item counts per product
    const productIds = (products||[]).map((p:any)=>p.id);
    let saleCounts: Record<string,number> = {};
    if (productIds.length > 0) {
      const { data: items } = await db.from("order_items").select("product_id").in("product_id", productIds);
      (items||[]).forEach((item:any)=>{ saleCounts[item.product_id] = (saleCounts[item.product_id]||0)+1; });
    }
    const enriched = (products||[]).map((p:any)=>({...p, num_of_sale: saleCounts[p.id]||0}));
    return NextResponse.json({ data: enriched, total: count||0 });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

write("app/api/admin/reports/seller-sale/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id") || "";
    let query = db.from("products").select("id, name, category_id, seller_id, categories!products_category_id_fkey(name), profiles!products_seller_id_fkey(full_name)", { count: "exact" })
      .not("seller_id","is",null);
    if (categoryId) query = query.eq("category_id", categoryId);
    query = query.order("name");
    const { data: products, error, count } = await query;
    if (error) throw error;
    const productIds = (products||[]).map((p:any)=>p.id);
    let saleCounts: Record<string,number> = {};
    if (productIds.length > 0) {
      const { data: items } = await db.from("order_items").select("product_id").in("product_id", productIds);
      (items||[]).forEach((item:any)=>{ saleCounts[item.product_id] = (saleCounts[item.product_id]||0)+1; });
    }
    const enriched = (products||[]).map((p:any)=>({...p, num_of_sale: saleCounts[p.id]||0}));
    return NextResponse.json({ data: enriched, total: count||0 });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

write("app/api/admin/reports/products-stock/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    let query = db.from("products").select("id, name, sku, stock_qty, price, category_id, categories!products_category_id_fkey(name)", {count:"exact"});
    if (search) query = query.ilike("name", \`%\${search}%\`);
    query = query.order("stock_qty", {ascending:true});
    const {data,error,count} = await query;
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

write("app/api/admin/reports/wishlist/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { data: wishlistItems } = await db.from("wishlists").select("product_id");
    const counts: Record<string,number> = {};
    (wishlistItems||[]).forEach((w:any)=>{ counts[w.product_id]=(counts[w.product_id]||0)+1; });
    const productIds = Object.keys(counts);
    if (productIds.length === 0) return NextResponse.json({data:[],total:0});
    const {data:products,error} = await db.from("products").select("id,name,price,thumbnail_url").in("id",productIds);
    if (error) throw error;
    const enriched = (products||[]).map((p:any)=>({...p,wishlist_count:counts[p.id]||0}))
      .sort((a:any,b:any)=>b.wishlist_count-a.wishlist_count);
    return NextResponse.json({data:enriched,total:enriched.length});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

write("app/api/admin/reports/user-searches/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("user_searches").select("*, profiles!user_searches_user_id_fkey(full_name)", {count:"exact"});
    if (search) query = query.ilike("search_term", \`%\${search}%\`);
    query = query.order("created_at",{ascending:false}).range(from, from+perPage-1);
    const {data,error,count} = await query;
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

write("app/api/admin/reports/commissions/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    const {data,error,count} = await db.from("commission_history")
      .select("*, profiles!commission_history_seller_id_fkey(full_name,avatar_url)", {count:"exact"})
      .order("created_at",{ascending:false}).range(from, from+perPage-1);
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

write("app/api/admin/reports/wallet-history/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")||"1");
    const search = searchParams.get("search")||"";
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("wallet_transactions")
      .select("*, profiles!wallet_transactions_user_id_fkey(full_name,avatar_url)", {count:"exact"});
    if (search) query = query.ilike("profiles.full_name", \`%\${search}%\`);
    query = query.order("created_at",{ascending:false}).range(from,from+perPage-1);
    const {data,error,count} = await query;
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

// ─── PAGES: Reports ──────────────────────────────────────────────────────────
const reportPageTemplate = (title, apiPath, columns, renderRow, showCategoryFilter = false) => `"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Filter, RefreshCcw } from "lucide-react";

export default function ${title.replace(/\s+/g,"_")}Page() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (categoryId) params.set("category_id", categoryId);
      const res = await fetch(\`${apiPath}?\${params}\`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } finally { setLoading(false); }
  }, [page, search, categoryId]);

  useEffect(() => {
    ${showCategoryFilter ? `fetch("/api/admin/products/categories").then(r=>r.json()).then(j=>setCategories(j.data||[]));` : ""}
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 px-6 py-4 flex flex-wrap items-center gap-3">
        ${showCategoryFilter ? `<div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by Category :</span>
          <select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setPage(1);}}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 min-w-[180px]">
            <option value="">All Categories</option>
            {categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={()=>{setPage(1);fetchData();}} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
            <Filter className="size-3.5"/> Filter
          </button>
        </div>` : `<input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchData()}
          placeholder="Search..." className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:border-orange-400" />`}
        <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 ml-auto">
          <RefreshCcw className="size-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">${title}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
                <th className="px-4 py-3 text-left w-12">#</th>
                ${columns}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={99} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              : data.length===0 ? <tr><td colSpan={99} className="px-4 py-16 text-center"><div className="text-4xl mb-2">☹</div><div className="text-gray-400">Nothing found</div></td></tr>
              : data.map((row:any,i:number)=><tr key={row.id||i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{(page-1)*perPage+i+1}</td>
                  ${renderRow}
                </tr>)}
            </tbody>
          </table>
        </div>
        {totalPages>1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">‹</button>
            {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={\`px-2.5 py-1 text-xs rounded \${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}\`}>{p}</button>
            ))}
            {totalPages>10 && <span className="text-xs text-gray-400 px-1">… {totalPages}</span>}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">›</button>
          </div>
        )}
      </div>
    </div>
  );
}
`;

write("app/admin/(dashboard)/reports/inhouse-sale/page.tsx",
  reportPageTemplate(
    "Inhouse Product sale report",
    "/api/admin/reports/inhouse-sale",
    `<th className="px-4 py-3 text-left">Product Name</th><th className="px-4 py-3 text-right">Num of Sale</th>`,
    `<td className="px-4 py-3 text-gray-800">{row.name}</td><td className="px-4 py-3 text-right font-semibold text-gray-700">{row.num_of_sale}</td>`,
    true
  )
);

write("app/admin/(dashboard)/reports/seller-sale/page.tsx",
  reportPageTemplate(
    "Seller Products Sale Report",
    "/api/admin/reports/seller-sale",
    `<th className="px-4 py-3 text-left">Product Name</th><th className="px-4 py-3 text-left">Seller</th><th className="px-4 py-3 text-right">Num of Sale</th>`,
    `<td className="px-4 py-3 text-gray-800">{row.name}</td><td className="px-4 py-3 text-gray-600">{row.profiles?.full_name||"—"}</td><td className="px-4 py-3 text-right font-semibold text-gray-700">{row.num_of_sale}</td>`,
    true
  )
);

write("app/admin/(dashboard)/reports/products-stock/page.tsx",
  reportPageTemplate(
    "Products Stock",
    "/api/admin/reports/products-stock",
    `<th className="px-4 py-3 text-left">Product Name</th><th className="px-4 py-3 text-left">SKU</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Stock</th>`,
    `<td className="px-4 py-3 text-gray-800">{row.name}</td><td className="px-4 py-3 font-mono text-xs text-gray-500">{row.sku||"—"}</td><td className="px-4 py-3 text-gray-600">{row.categories?.name||"—"}</td><td className="px-4 py-3 text-right text-gray-700">{row.price}</td><td className="px-4 py-3 text-right"><span className={\`font-semibold \${(row.stock_qty||0)<5?"text-red-500":"text-gray-700"}\`}>{row.stock_qty||0}</span></td>`,
    false
  )
);

write("app/admin/(dashboard)/reports/wishlist/page.tsx",
  reportPageTemplate(
    "Products Wishlist",
    "/api/admin/reports/wishlist",
    `<th className="px-4 py-3 text-left">Product Name</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Wishlist Count</th>`,
    `<td className="px-4 py-3 text-gray-800">{row.name}</td><td className="px-4 py-3 text-right text-gray-700">{row.price}</td><td className="px-4 py-3 text-right font-semibold text-indigo-600">{row.wishlist_count}</td>`,
    false
  )
);

write("app/admin/(dashboard)/reports/user-searches/page.tsx",
  reportPageTemplate(
    "User Searches",
    "/api/admin/reports/user-searches",
    `<th className="px-4 py-3 text-left">Search Term</th><th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-right">Results</th><th className="px-4 py-3 text-right">Date</th>`,
    `<td className="px-4 py-3 font-medium text-gray-800">{row.search_term}</td><td className="px-4 py-3 text-gray-500">{row.profiles?.full_name||"Guest"}</td><td className="px-4 py-3 text-right text-gray-600">{row.results_count||0}</td><td className="px-4 py-3 text-right text-xs text-gray-400">{new Date(row.created_at).toLocaleDateString()}</td>`,
    false
  )
);

write("app/admin/(dashboard)/reports/commissions/page.tsx",
  reportPageTemplate(
    "Commission History",
    "/api/admin/reports/commissions",
    `<th className="px-4 py-3 text-left">Seller</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3 text-right">Rate (%)</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-right">Date</th>`,
    `<td className="px-4 py-3 text-gray-800">{row.profiles?.full_name||"—"}</td><td className="px-4 py-3 text-right font-semibold text-emerald-600">{row.commission}</td><td className="px-4 py-3 text-right text-gray-500">{row.commission_pct}%</td><td className="px-4 py-3 text-gray-500 capitalize">{row.type}</td><td className="px-4 py-3 text-right text-xs text-gray-400">{new Date(row.created_at).toLocaleDateString()}</td>`,
    false
  )
);

write("app/admin/(dashboard)/reports/wallet-history/page.tsx",
  reportPageTemplate(
    "Wallet Recharge History",
    "/api/admin/reports/wallet-history",
    `<th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-right">Date</th>`,
    `<td className="px-4 py-3 text-gray-800">{row.profiles?.full_name||"Unknown"}</td><td className="px-4 py-3 text-right font-semibold \${row.type==='credit'?'text-emerald-600':'text-red-500'}">{row.type==='credit'?'+':'-'}{row.amount}</td><td className="px-4 py-3"><span className={\`px-2 py-0.5 rounded text-[10px] font-medium \${row.type==='credit'?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-500'}\`}>{row.type}</span></td><td className="px-4 py-3 text-xs text-gray-500">{row.description||"—"}</td><td className="px-4 py-3 text-right text-xs text-gray-400">{new Date(row.created_at).toLocaleDateString()}</td>`,
    false
  )
);

// ─── redirect /reports/page.tsx ───────────────────────────────────────────
write("app/admin/(dashboard)/reports/page.tsx", `import { redirect } from "next/navigation";
export default function ReportsPage() { redirect("/admin/reports/inhouse-sale"); }
`);

console.log("\\n✅ Reports done");
