"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, api } from "@/lib/api";
import type { QuoteMessage, QuoteRequest } from "@/lib/types";

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

type Props = {
  quoteId: string;
  mode: "admin" | "customer";
  /** Required when mode is customer */
  customerEmail?: string;
  /** Merge thread-only fields into parent state */
  onThreadUpdate?: (q: QuoteRequest) => void;
};

export default function QuoteThreadPanel({ quoteId, mode, customerEmail, onThreadUpdate }: Props) {
  const threadCb = useRef(onThreadUpdate);
  useEffect(() => {
    threadCb.current = onThreadUpdate;
  }, [onThreadUpdate]);
  const [messages, setMessages] = useState<QuoteMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<NonNullable<QuoteMessage["attachments"]>>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      if (mode === "admin") {
        const res = await adminApi.get<QuoteRequest>(`/quote-request/${quoteId}`);
        const m = res.data.messages || [];
        setMessages(m);
        threadCb.current?.(res.data);
      } else {
        if (!customerEmail?.trim()) return;
        const res = await api.post<QuoteRequest>("/quote-request/thread", {
          id: quoteId,
          email: customerEmail.trim(),
        });
        const m = res.data.messages || [];
        setMessages(m);
        threadCb.current?.(res.data);
      }
    } catch {
      setErr("Could not load conversation.");
    } finally {
      setLoading(false);
    }
  }, [quoteId, mode, customerEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      void load();
    }, mode === "admin" ? 5000 : 8000);
    return () => clearInterval(t);
  }, [load, mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if ((editingMessageId && !body) || (!editingMessageId && !body && attachments.length === 0) || body.length > 8000) return;
    setSending(true);
    setErr(null);
    try {
      if (mode === "admin") {
        const res = editingMessageId
          ? await adminApi.patch<QuoteRequest>(`/quote-request/${quoteId}/message/${editingMessageId}`, { body })
          : await adminApi.post<QuoteRequest>(`/quote-request/${quoteId}/message`, { body, attachments });
        setMessages(res.data.messages || []);
        setDraft("");
        setAttachments([]);
        setEditingMessageId(null);
        threadCb.current?.(res.data);
      } else {
        if (!customerEmail?.trim()) return;
        const res = await api.post<QuoteRequest>("/quote-request/message", {
          id: quoteId,
          email: customerEmail.trim(),
          body,
          attachments,
        });
        setMessages(res.data.messages || []);
        setDraft("");
        setAttachments([]);
        setEditingMessageId(null);
        threadCb.current?.(res.data);
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setErr(ax?.response?.data?.message ?? "Could not send.");
    } finally {
      setSending(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    if (attachments.length >= 5) {
      setErr("You can add up to 5 attachments.");
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (mode === "admin") {
        const res = await adminApi.post(`/quote-request/${quoteId}/attachment`, fd);
        setAttachments((prev) => [...prev, res.data]);
      } else {
        if (!customerEmail?.trim()) return;
        fd.append("id", quoteId);
        fd.append("email", customerEmail.trim());
        const res = await api.post("/quote-request/attachment", fd);
        setAttachments((prev) => [...prev, res.data]);
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setErr(ax?.response?.data?.message ?? "Could not upload attachment.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Conversation</h3>
        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {mode === "admin"
            ? "Messages sync every few seconds. Customer sees replies on Track enquiry."
            : "We typically reply within one business day. Keep this tab open or check back here."}
        </p>
      </div>
      <div className="max-h-[min(52vh,420px)] min-h-[200px] space-y-3 overflow-y-auto px-3 py-4">
        {loading && messages.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">No replies yet — say hello below.</p>
        ) : (
          messages.map((m, i) => {
            const isAdmin = m.role === "admin";
            const key = m._id || `${i}-${m.createdAt || i}`;
            return (
              <div key={key} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[85%] ${
                    isAdmin
                      ? "rounded-br-sm bg-blue-600 text-white dark:bg-blue-700"
                      : "rounded-bl-sm border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {isAdmin ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-100/90">
                      {m.adminLabel ? `${m.adminLabel} · Workshop` : "Workshop"}
                    </p>
                  ) : (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {mode === "admin" ? "Customer" : "You"}
                    </p>
                  )}
                  <p className={`mt-1 whitespace-pre-wrap ${isAdmin ? "text-white" : ""}`}>{m.body}</p>
                  {Array.isArray(m.attachments) && m.attachments.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {m.attachments.map((a, ai) => {
                        const keyA = `${key}-a-${ai}`;
                        return a.kind === "image" ? (
                          <a key={keyA} href={a.url} target="_blank" rel="noreferrer" className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt={a.name || "Attachment"} className="max-h-44 rounded-xl border border-black/10 object-cover dark:border-white/10" />
                          </a>
                        ) : (
                          <a key={keyA} href={a.url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${isAdmin ? "border-blue-200/40 bg-blue-500/20 text-white" : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-200"}`}>
                            PDF: {a.name || "Attachment"}
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                  <p className={`mt-1.5 text-[10px] ${isAdmin ? "text-blue-100/80" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {formatTime(m.createdAt)}
                  </p>
                  {mode === "admin" && isAdmin && m._id ? (
                    <div className="mt-1 text-right">
                      <button
                        type="button"
                        className="rounded-md border border-blue-200/40 bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-white/95 hover:bg-blue-500/30"
                        onClick={() => {
                          setEditingMessageId(m._id || null);
                          setDraft(m.body || "");
                          setAttachments([]);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {err ? <p className="px-4 pb-2 text-xs text-rose-600 dark:text-rose-400">{err}</p> : null}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
        <label className="sr-only" htmlFor={`thread-input-${quoteId}`}>
          {mode === "admin" ? "Reply to customer" : "Your message"}
        </label>
        <textarea
          id={`thread-input-${quoteId}`}
          className="min-h-[72px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder={mode === "admin" ? (editingMessageId ? "Edit reply and update…" : "Type a reply…") : "Ask a follow-up question…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={8000}
          disabled={sending}
        />
        {editingMessageId ? (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            <span>Editing sent message</span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                setEditingMessageId(null);
                setDraft("");
                setAttachments([]);
              }}
            >
              Cancel
            </button>
          </div>
        ) : null}
        {!editingMessageId ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0] || null)}
            disabled={uploading || sending}
          />
          <button
            type="button"
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
          >
            {uploading ? "Uploading..." : "Attach image/PDF"}
          </button>
          {attachments.length ? <span className="text-[11px] text-zinc-500">{attachments.length}/5 attached</span> : null}
        </div>
        ) : null}
        {!editingMessageId && attachments.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((a, idx) => (
              <span key={`${a.url}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                {a.kind === "pdf" ? "PDF" : "IMG"}: {a.name || `Attachment ${idx + 1}`}
                <button type="button" className="font-bold leading-none text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => removeAttachment(idx)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-zinc-400">{draft.length}/8000</span>
          <button
            type="button"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            disabled={sending || uploading || (!draft.trim() && attachments.length === 0)}
            onClick={() => void send()}
          >
            {sending ? "Sending…" : mode === "admin" ? (editingMessageId ? "Update reply" : "Send reply") : "Send message"}
          </button>
        </div>
      </div>
    </div>
  );
}
