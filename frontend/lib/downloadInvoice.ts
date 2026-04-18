import axios from "axios";
import { api } from "@/lib/api";

/**
 * Downloads invoice PDF after server verifies booking ID + email (same rules as track lookup).
 */
export async function downloadBookingInvoice(id: string, email: string): Promise<void> {
  try {
    const res = await api.post<Blob>(
      "/booking/invoice",
      { id: id.trim(), email: email.trim() },
      { responseType: "blob" }
    );
    const blob = res.data;
    const ct = (res.headers["content-type"] || "").toLowerCase();
    if (ct.includes("application/json")) {
      const text = await blob.text();
      let message = "Could not download invoice.";
      try {
        const j = JSON.parse(text) as { message?: string };
        if (j.message) message = j.message;
      } catch {
        /* keep default */
      }
      throw new Error(message);
    }
    const disp = res.headers["content-disposition"] || "";
    let filename = `invoice-${id.trim().slice(-8)}.pdf`;
    const m = /filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i.exec(disp);
    if (m) {
      try {
        filename = decodeURIComponent(m[1].replace(/^UTF-8''/, ""));
      } catch {
        filename = m[1];
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
      const text = await e.response.data.text();
      let message = "Could not download invoice.";
      try {
        const j = JSON.parse(text) as { message?: string };
        if (j.message) message = j.message;
      } catch {
        /* keep default */
      }
      throw new Error(message);
    }
    throw e;
  }
}
