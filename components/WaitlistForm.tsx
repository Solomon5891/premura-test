"use client";

import { useEffect, useRef, useState } from "react";
import {
  captureAttribution,
  flattenForApi,
  type Attribution,
} from "@/lib/attribution";
import { track } from "@/lib/track";

type Status = "idle" | "submitting" | "success" | "error";

const FORM_NAME = "waitlist";

export default function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const attrRef = useRef<Attribution | null>(null);
  const focusedOnce = useRef(false);

  useEffect(() => {
    attrRef.current = captureAttribution();
  }, []);

  function onFirstFocus() {
    if (focusedOnce.current) return;
    focusedOnce.current = true;
    track("form_focus", { form: FORM_NAME });
  }

  function onFieldBlur(field: string, value: string) {
    track("form_field_blur", {
      form: FORM_NAME,
      field,
      filled: value.trim().length > 0,
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    track("form_submit_attempt", { form: FORM_NAME });

    setStatus("submitting");
    setErrorMsg(null);

    const fd = new FormData(e.currentTarget);
    const attr = attrRef.current ?? captureAttribution();

    const payload = {
      full_name: String(fd.get("full_name") ?? ""),
      work_email: String(fd.get("work_email") ?? ""),
      company: String(fd.get("company") ?? ""),
      ...flattenForApi(attr),
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
        track("form_validation_error", {
          form: FORM_NAME,
          status_code: res.status,
          error_message: json.error ?? "unknown",
        });
        return;
      }
      setStatus("success");
      track("waitlist_signup_client", { form: FORM_NAME });
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Try again.");
      track("form_validation_error", {
        form: FORM_NAME,
        status_code: 0,
        error_message: "network_error",
      });
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

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/30";

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
          onFocus={onFirstFocus}
          onBlur={(e) => onFieldBlur("full_name", e.target.value)}
          className={inputClass}
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
          onFocus={onFirstFocus}
          onBlur={(e) => onFieldBlur("work_email", e.target.value)}
          className={inputClass}
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
          onFocus={onFirstFocus}
          onBlur={(e) => onFieldBlur("company", e.target.value)}
          className={inputClass}
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
