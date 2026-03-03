"use client";

import { useState } from "react";
import { Menu, Plus, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";

type MenuItem = {
  id: string;
  label: string;
  url: string;
  children: MenuItem[];
};

type MenuGroup = {
  id: string;
  name: string;
  location: string;
  items: MenuItem[];
};

const defaultMenus: MenuGroup[] = [
  {
    id: "main",
    name: "Main Navigation",
    location: "header",
    items: [
      { id: "1", label: "Home", url: "/", children: [] },
      { id: "2", label: "Categories", url: "/categories", children: [] },
      { id: "3", label: "Flash Deals", url: "/flash-deals", children: [] },
      { id: "4", label: "Brands", url: "/brands", children: [] },
      { id: "5", label: "Blog", url: "/blog", children: [] },
    ],
  },
  {
    id: "footer",
    name: "Footer Links",
    location: "footer",
    items: [
      { id: "6", label: "Privacy Policy", url: "/privacy-policy", children: [] },
      { id: "7", label: "Terms of Service", url: "/terms", children: [] },
      { id: "8", label: "Return Policy", url: "/return-policy", children: [] },
      { id: "9", label: "Support", url: "/support-policy", children: [] },
    ],
  },
];

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuGroup[]>(defaultMenus);
  const [editingMenu, setEditingMenu] = useState<string | null>("main");
  const [newItem, setNewItem] = useState({ label: "", url: "" });

  const activeMenu = menus.find((m) => m.id === editingMenu);

  const addItem = () => {
    if (!newItem.label || !newItem.url || !editingMenu) return;
    setMenus((prev) =>
      prev.map((m) =>
        m.id === editingMenu
          ? { ...m, items: [...m.items, { id: Date.now().toString(), label: newItem.label, url: newItem.url, children: [] }] }
          : m
      )
    );
    setNewItem({ label: "", url: "" });
  };

  const removeItem = (menuId: string, itemId: string) => {
    setMenus((prev) =>
      prev.map((m) =>
        m.id === menuId ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m
      )
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Menu Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure navigation menus for your storefront</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Menus</h2>
            {menus.map((m) => (
              <button
                key={m.id}
                onClick={() => setEditingMenu(m.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${editingMenu === m.id ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-2">
                  <Menu className="size-4" />
                  {m.name}
                </div>
                <p className="text-xs text-gray-400 ml-6">{m.location} &middot; {m.items.length} items</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeMenu ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{activeMenu.name}</h2>
                  <p className="text-xs text-gray-500">Location: {activeMenu.location}</p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {activeMenu.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg group">
                    <GripVertical className="size-4 text-gray-300" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.url}</p>
                    </div>
                    <button onClick={() => removeItem(activeMenu.id, item.id)} className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="size-4" /></button>
                  </div>
                ))}

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-700 mb-2">Add Menu Item</p>
                  <div className="flex gap-2">
                    <Input value={newItem.label} onChange={(e) => setNewItem({ ...newItem, label: e.target.value })} placeholder="Label" className="flex-1" />
                    <Input value={newItem.url} onChange={(e) => setNewItem({ ...newItem, url: e.target.value })} placeholder="/url-path" className="flex-1" />
                    <button onClick={addItem} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap">
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-amber-600">Note: Menu persistence requires a dedicated menus API endpoint and database table. Currently using local state.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <Menu className="size-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a menu to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
