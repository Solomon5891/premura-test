"use client";

import { useEffect, useRef, useState } from "react";
import { captureAttribution, type Attribution } from "@/lib/attribution";

type Status = "idle" | "submitting" | "success" | "error";

export default function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const attrRef = useRef<Attribution | null>(null);

  useEffect(() => {
    attrRef.current = captureAttribution();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      full_name: String(fd.get("full_name") ?? ""),
      work_email: String(fd.get("work_email") ?? ""),
      company: String(fd.get("company") ?? ""),
      ...(attrRef.current ?? {}),
    };

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Something went wrong.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-100">
        <p className="text-lg font-semibold">You're on the list.</p>
        <p className="mt-1 text-sm text-emerald-200/80">
          We'll be in touch from a real human at your work address.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="full_name" className="sr-only">Full name</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          placeholder="Full name"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label htmlFor="work_email" className="sr-only">Work email</label>
        <input
          id="work_email"
          name="work_email"
          type="email"
          required
          autoComplete="email"
          placeholder="Work email"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label htmlFor="company" className="sr-only">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          required
          autoComplete="organization"
          placeholder="Company"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/30"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Joining…" : "Request early access"}
      </button>

      {errorMsg && (
        <p role="alert" className="text-sm text-rose-300">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
