"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CAMPAIGN, SITE } from "@/data/site";
import {
  isValidCustomerName,
  isValidEmail,
  isValidPhone,
  isValidRegistration,
  sanitizeCustomerName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeRegistration,
} from "@/lib/booking-validation";

const STORAGE_KEY = "glansig-offer-popup-dismissed";

function formatRegistrationDisplayLocal(value: string) {
  const compact = sanitizeRegistration(value).replace(/\s/g, "");
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

async function sendOfferLead(fields: {
  name: string;
  phone: string;
  email: string;
  registration: string;
}) {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    throw new Error("Erbjudandet kunde inte skickas just nu.");
  }

  const message = [
    "Ny förfrågan – 50% rabatt på helrekond",
    "",
    `Namn: ${fields.name}`,
    `Telefon: ${fields.phone}`,
    `E-post: ${fields.email}`,
    `Registreringsnummer: ${fields.registration}`,
    "",
    "Kampanj: Just nu 1 495 kr (Ord. pris 3 000 kr)",
    SITE.name,
  ].join("\n");

  const formData = new FormData();
  formData.append("access_key", accessKey);
  formData.append("subject", `Erbjudande – helrekond – ${fields.registration}`);
  formData.append("from_name", `${SITE.name} – Erbjudande`);
  formData.append("name", fields.name);
  formData.append("email", fields.email);
  formData.append("phone", fields.phone);
  formData.append("Registreringsnummer", fields.registration);
  formData.append("Kampanj", "50% rabatt på helrekond – 1 495 kr");
  formData.append("message", message);

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as { success?: boolean; message?: string };
  if (!response.ok || !data.success) {
    throw new Error(data.message ?? "Kunde inte skicka formuläret.");
  }
}

export default function OfferPopup() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [registration, setRegistration] = useState("");

  useEffect(() => {
    if (!CAMPAIGN.active) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // ignore
    }
    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const canSubmit =
    isValidCustomerName(name) &&
    isValidPhone(phone) &&
    isValidEmail(email) &&
    isValidRegistration(registration) &&
    !submitting;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      name: sanitizeCustomerName(name),
      phone: sanitizePhone(phone),
      email: sanitizeEmail(email),
      registration: formatRegistrationDisplayLocal(registration),
    };

    try {
      await sendOfferLead(payload);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
      router.push(CAMPAIGN.ctaLink);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || "Kunde inte skicka. Försök igen.");
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="offer-popup" role="dialog" aria-modal="true" aria-labelledby="offer-popup-title">
      <button type="button" className="offer-popup-backdrop" aria-label="Stäng" onClick={dismiss} />
      <div className="offer-popup-panel">
        <button type="button" className="offer-popup-close" onClick={dismiss} aria-label="Stäng">
          ×
        </button>

        <div className="offer-popup-hero">
          <h2 id="offer-popup-title" className="offer-popup-title">
            <span className="offer-popup-title-accent">50% RABATT</span>
            <span className="offer-popup-title-main">PÅ HELREKOND</span>
          </h2>
          <p className="offer-popup-desc">
            Just nu 1 495 kr (Ord. pris 3 000 kr) Inklusive en anpassad polering, noggrann vaxning
            och en detaljerad Rekond!
          </p>
          <p className="offer-popup-tag">Tidsbegränsat nykundserbjudande</p>
        </div>

        <form className="offer-popup-card" onSubmit={onSubmit} noValidate>
          <label className="offer-popup-field">
            <span className="offer-popup-label">
              För- &amp; Efternamn <span aria-hidden>*</span>
            </span>
            <input
              className="offer-popup-input"
              type="text"
              name="name"
              placeholder="För- & Efternamn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setName(sanitizeCustomerName(name))}
              autoComplete="name"
              required
            />
          </label>

          <label className="offer-popup-field">
            <span className="offer-popup-label">
              Telefonnummer <span aria-hidden>*</span>
            </span>
            <input
              className="offer-popup-input"
              type="tel"
              name="phone"
              placeholder="Telefonnummer"
              value={phone}
              onChange={(e) => setPhone(sanitizePhone(e.target.value))}
              autoComplete="tel"
              inputMode="tel"
              required
            />
          </label>

          <label className="offer-popup-field">
            <span className="offer-popup-label">
              Mejladress <span aria-hidden>*</span>
            </span>
            <div className="offer-popup-input-wrap">
              <span className="offer-popup-input-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 6.5h16v11H4v-11Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="m4.5 7 7.5 6 7.5-6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <input
                className="offer-popup-input offer-popup-input--icon"
                type="email"
                name="email"
                placeholder="Mejladress"
                value={email}
                onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>
          </label>

          <label className="offer-popup-field">
            <span className="offer-popup-label">
              Registreringsnummer <span aria-hidden>*</span>
            </span>
            <input
              className="offer-popup-input"
              type="text"
              name="registration"
              placeholder="Registreringsnummer"
              value={registration}
              onChange={(e) => setRegistration(formatRegistrationDisplayLocal(e.target.value))}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={8}
              required
            />
          </label>

          {error && <p className="offer-popup-error">{error}</p>}

          <button type="submit" className="offer-popup-submit" disabled={!canSubmit}>
            <span className="offer-popup-submit-main">
              {submitting ? "Skickar…" : "Hämta Erbjudandet"}
            </span>
            <span className="offer-popup-submit-sub">Just Nu fr. 1.495:- (Ord. fr. 3.000:-)</span>
          </button>
        </form>
      </div>
    </div>
  );
}
