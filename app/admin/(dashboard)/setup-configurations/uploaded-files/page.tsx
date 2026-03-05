"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Trash2, MoreVertical, Copy, ExternalLink, RefreshCcw, Upload } from "lucide-react";
interface UploadedFile { id:string; file_name:string; file_url:string; file_size:number; mime_type:string; created_at:string; }
function formatSize(bytes:number) {
  if(bytes<1024) return bytes+"B"; if(bytes<1024*1024) return (bytes/1024).toFixed(2)+"KB";
  return (bytes/(1024*1024)).toFixed(2)+"MB";
}
export default function UploadedFilesPage() {
  const [data, setData] = useState<UploadedFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string|null>(null);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(m:string,ok=true)=>{setToast({msg:m,ok});setTimeout(()=>setToast(null),3000);};
  const perPage=24;

  const fetchData=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await fetch(`/api/admin/setup-configurations/uploaded-files?page=${page}`);
      const j=await r.json(); setData(j.data||[]); setTotal(j.total||0);
    }finally{setLoading(false);}
  },[page]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  // Close menu when clicking outside
  useEffect(()=>{
    const h=()=>setOpenMenu(null);
    document.addEventListener("click",h);
    return ()=>document.removeEventListener("click",h);
  },[]);

  const handleDelete=async(id:string)=>{
    if(!confirm("Delete file?"))return;
    await fetch(`/api/admin/setup-configurations/uploaded-files?id=${id}`,{method:"DELETE"});
    notify("Deleted"); fetchData();
  };

  const handleCopy=(url:string)=>{ navigator.clipboard.writeText(url); notify("URL copied"); };

  const totalPages=Math.ceil(total/perPage);

  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-base font-semibold text-gray-800">Uploaded Files</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><RefreshCcw className="size-4"/></button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : data.length===0 ? (
        <div className="text-center py-20 text-gray-400">No uploaded files</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.map(file=>(
            <div key={file.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              {/* Image */}
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {file.mime_type.startsWith("image/") ? (
                  <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Upload className="size-8"/>
                  </div>
                )}
                {/* Menu button */}
                <div className="absolute top-1.5 right-1.5">
                  <button onClick={e=>{e.stopPropagation();setOpenMenu(openMenu===file.id?null:file.id);}}
                    className="p-1 rounded bg-white/80 hover:bg-white shadow-sm text-gray-600">
                    <MoreVertical className="size-3.5"/>
                  </button>
                  {openMenu===file.id && (
                    <div className="absolute right-0 top-7 bg-white rounded-lg shadow-xl border border-gray-100 z-20 w-36 py-1" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>handleCopy(file.file_url)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <Copy className="size-3"/>Copy URL
                      </button>
                      <a href={file.file_url} target="_blank" rel="noopener" className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <ExternalLink className="size-3"/>Open
                      </a>
                      <button onClick={()=>handleDelete(file.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                        <Trash2 className="size-3"/>Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Info */}
              <div className="px-2 py-1.5">
                <p className="text-[10px] text-gray-700 truncate font-medium" title={file.file_name}>{file.file_name}</p>
                <p className="text-[10px] text-gray-400">{formatSize(file.file_size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages>1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">‹</button>
          {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
            <button key={p} onClick={()=>setPage(p)} className={`px-2.5 py-1 text-xs rounded ${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}`}>{p}</button>
          ))}
          {totalPages>10 && <span className="text-xs text-gray-400">… {totalPages}</span>}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">›</button>
        </div>
      )}
    </div>
  );
}
