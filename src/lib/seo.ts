import type { Metadata } from "next";
import { SERVICES, SITE } from "@/data/site";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://glansbilvatt.se";

export const SEO_KEYWORDS = [
  "biltvätt",
  "bilrekond",
  "handtvätt bil",
  "bilvård",
  "biltvätt Eskilstuna",
  "bilrekond Eskilstuna",
  "handtvätt Eskilstuna",
  "rekond bil",
  "biltvätt pris",
  "bilrekond pris",
  "invändig biltvätt",
  "utvändig biltvätt",
  "lackskydd bil",
  "polering bil",
  "bilrekonditionering",
  "professionell biltvätt",
  "Glansbilvatt",
] as const;

export const DEFAULT_TITLE =
  "Biltvätt & Bilrekond Eskilstuna | Handtvätt & Rekond – Glansbilvatt";

export const DEFAULT_DESCRIPTION =
  "Glansbilvatt erbjuder professionell biltvätt, handtvätt och bilrekond i Eskilstuna. Boka tid online – invändig & utvändig tvätt, lackskydd, polering och bilvård.";

type PageMetaOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
}: PageMetaOptions): Metadata {
  const url = absoluteUrl(path);
  const allKeywords = [...new Set([...SEO_KEYWORDS, ...keywords])];

  return {
    title,
    description,
    keywords: allKeywords,
    alternates: {
      canonical: url,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: "website",
      locale: "sv_SE",
      url,
      siteName: SITE.name,
      title: `${title} | ${SITE.name}`,
      description,
      images: [
        {
          url: absoluteUrl("/hero-car.png"),
          width: 900,
          height: 500,
          alt: "Professionell biltvätt och bilrekond i Eskilstuna – Glansbilvatt",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE.name}`,
      description,
      images: [absoluteUrl("/hero-car.png")],
    },
  };
}

export const FAQ_ITEMS = [
  {
    question: "Vad kostar biltvätt i Eskilstuna hos Glansbilvatt?",
    answer:
      "Handtvätt utvändigt och invändigt startar från 300 kr. Komplett in- och utvändig tvätt från 499 kr. Se hela prislistan under Tjänster & priser för bilrekond, lackskydd, polering och tilläggstjänster.",
  },
  {
    question: "Vad ingår i bilrekond?",
    answer:
      "Bilrekond hos oss omfattar grundlig rengöring, polering, lackskydd och behandling av interiör beroende på paket. Vi anpassar rekonden efter bilens skick och dina önskemål.",
  },
  {
    question: "Hur bokar jag tid för handtvätt eller bilrekond?",
    answer:
      "Välj tjänster på vår prislista, lägg till i kundvagnen och boka tid direkt online. Du kan också ringa oss på 076-267 14 14, 016-4003621 eller maila info@glansbilvatt.se.",
  },
  {
    question: "Var ligger Glansbilvatt?",
    answer:
      "Vi finns på Mått Johansson väg 36, 633 46 Eskilstuna. Lätt att hitta med bil – välkommen för biltvätt och bilvård.",
  },
  {
    question: "Vilka öppettider har ni?",
    answer:
      "Måndag till fredag 08–18, lördag 10–17. Boka gärna tid i förväg för handtvätt och bilrekond.",
  },
] as const;

function toSchemaTime(value: string) {
  const trimmed = value.trim();
  return trimmed.includes(":") ? trimmed : `${trimmed}:00`;
}

function parseHourRange(hours: string) {
  const [opens, closes] = hours.split("–").map((part) => toSchemaTime(part));
  return { opens, closes };
}

export function getOpeningHoursSpecification() {
  const weekday = parseHourRange(SITE.openingHours[0].hours);
  const saturday = parseHourRange(SITE.openingHours[1].hours);

  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: weekday.opens,
      closes: weekday.closes,
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: saturday.opens,
      closes: saturday.closes,
    },
  ];
}

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE.name,
    url: SITE_URL,
    logo: absoluteUrl("/hero-car.png"),
    email: SITE.email,
    telephone: [SITE.phone, SITE.phoneSecondary],
    description: DEFAULT_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      postalCode: SITE.address.postalCode,
      addressLocality: SITE.address.city,
      addressCountry: "SE",
    },
  };
}

export function getLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutomotiveBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: SITE.name,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    image: absoluteUrl("/hero-car.png"),
    telephone: [SITE.phone, SITE.phoneSecondary],
    email: SITE.email,
    priceRange: "$$",
    currenciesAccepted: "SEK",
    paymentAccepted: "Cash, Credit Card, Swish",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      postalCode: SITE.address.postalCode,
      addressLocality: SITE.address.city,
      addressCountry: "SE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    openingHoursSpecification: getOpeningHoursSpecification(),
    areaServed: {
      "@type": "City",
      name: "Eskilstuna",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Biltvätt och bilrekond",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Handtvätt utvändigt" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Handtvätt invändigt" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Bilrekond" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Lackskydd och polering" } },
      ],
    },
    sameAs: [SITE.address.mapsHref],
  };
}

export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE.name,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "sv-SE",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function getFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function getBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function getServicesItemListJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Biltvätt och bilrekond – prislista",
    description: "Tjänster och priser för handtvätt, bilrekond och bilvård i Eskilstuna.",
    numberOfItems: SERVICES.length,
    itemListElement: SERVICES.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        offers: {
          "@type": "Offer",
          priceCurrency: "SEK",
          availability: "https://schema.org/InStock",
          url: absoluteUrl("/tjanster"),
        },
        provider: { "@id": `${SITE_URL}/#localbusiness` },
        areaServed: "Eskilstuna",
      },
    })),
  };
}

export const GLOBAL_JSON_LD = [
  getOrganizationJsonLd(),
  getLocalBusinessJsonLd(),
  getWebsiteJsonLd(),
];
