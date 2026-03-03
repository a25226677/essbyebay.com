"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MessageSquare, Send, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Conversation = {
  id: string;
  customerName: string;
  customerAvatar: string | null;
  lastMessage: string | null;
  lastAt: string;
};

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  senderName: string;
  isSeller: boolean;
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadConversations() {
      setLoadingList(true);
      try {
        const res = await fetch("/api/seller/conversations", { cache: "no-store" });
        const json = await res.json();
        if (res.ok) setConversations(json.conversations ?? []);
      } finally {
        setLoadingList(false);
      }
    }
    loadConversations();
  }, []);

  async function loadMessages(conv: Conversation) {
    setSelected(conv);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/seller/conversations?id=${conv.id}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setMessages(json.messages ?? []);
    } finally {
      setLoadingMessages(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function handleSend() {
    if (!selected || !message.trim() || sending) return;
    setSending(true);
    const body = message.trim();
    setMessage("");
    try {
      const res = await fetch("/api/seller/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, body }),
      });
      const json = await res.json();
      if (res.ok && json.message) {
        setMessages((prev) => [...prev, json.message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } finally {
      setSending(false);
    }
  }

  const filtered = search
    ? conversations.filter((c) => c.customerName.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Conversations</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[560px]">
          {/* Conversation list */}
          <div className="border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-sky-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <MessageSquare className="size-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                </div>
              ) : (
                filtered.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadMessages(conv)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-sky-50/50 transition-colors ${
                      selected?.id === conv.id ? "bg-sky-50 border-l-2 border-l-sky-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-sky-100 overflow-hidden shrink-0 relative">
                        {conv.customerAvatar ? (
                          <Image src={conv.customerAvatar} alt={conv.customerName} fill sizes="36px" className="object-cover" />
                        ) : (
                          <span className="flex items-center justify-center h-full text-sky-600 font-bold text-sm">
                            {conv.customerName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{conv.customerName}</p>
                        <p className="text-xs text-gray-400 truncate">{conv.lastMessage ?? "No messages yet"}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="lg:col-span-2 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="size-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400">Select a conversation to start chatting</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-sky-100 overflow-hidden relative shrink-0">
                    {selected.customerAvatar ? (
                      <Image src={selected.customerAvatar} alt={selected.customerName} fill sizes="32px" className="object-cover" />
                    ) : (
                      <span className="flex items-center justify-center h-full text-sky-600 font-bold text-sm">
                        {selected.customerName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-gray-800">{selected.customerName}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[400px]">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="size-6 animate-spin text-sky-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No messages yet. Say hello!</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.isSeller ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                            msg.isSeller
                              ? "bg-sky-500 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-800 rounded-bl-sm"
                          }`}
                        >
                          <p>{msg.body}</p>
                          <p className={`text-[10px] mt-1 ${msg.isSeller ? "text-sky-200" : "text-gray-400"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-200">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={sending || !message.trim()}
                      className="bg-sky-500 hover:bg-sky-600 text-white"
                    >
                      {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
