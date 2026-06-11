# Web Agency Business Plan — Two-Person Studio

> Source: "מסמך ללא שם.docx" (converted 2026-06-11)

## Overview

A two-person web agency that builds websites for small businesses using reusable templates, Claude Code for fast delivery, and a monthly maintenance model for recurring income.

## Phase 1 — Foundation (Month 1)

Goal: set up everything before taking clients.

- **Define roles** — Decide who handles design, who handles client communication, and who manages the code. Even if you both do everything at first, having a "main person" per area avoids confusion.
- **Set up GitHub** — Create a shared organization, one repo per client, and agree on a basic Git workflow with your partner so you don't overwrite each other's work.
- **Build 2–3 templates** — Create reusable website skeletons for common business types: restaurant, service business (plumber, lawyer, clinic), and portfolio/freelancer. These are your products.
- **Build a client intake form** — A simple form clients fill in before you start: business name, logo, brand colors, text content, photos, services, and contact info. This saves enormous time.

## Phase 2 — First Clients (Months 2–3)

Goal: get your first 3 paying clients and build a portfolio.

- **Friends and family first** — Offer a small discount to 1–2 local businesses you know personally. The goal is portfolio pieces and testimonials, not maximum profit yet.
- **Build your own agency website** — It's your best sales pitch and a live demo of your work. If your site looks bad, no one will hire you.
- **Spread the word** — Post in local WhatsApp business groups, Facebook Marketplace, and LinkedIn. Show screenshots of your work. Ask people you know to refer you.
- **Set your pricing** — Suggested starting prices for Israel:
  - Basic website (up to 5 pages): ₪1,500 – ₪3,000
  - Monthly hosting + maintenance plan: ₪150 – ₪300/month
  - Extra pages, contact forms, photo galleries: charge separately

## Phase 3 — System and Scale (Months 4–6)

Goal: build a repeatable system so every client site takes less time.

- **Auto-fill script** — Use Claude Code to build a script that generates a new client site from a simple config file (client name, colors, text, logo). One command, site is ready to customize.
- **Delivery checklist** — Before handing over every site, check: mobile looks good, page loads fast, contact form works, basic SEO is set (page titles, description, Google-friendly URLs), Google Maps embed is correct.
- **Push recurring revenue** — Every client should be on a monthly plan. Include hosting, security updates, small text changes, and a backup. This creates stable monthly income on top of new site projects.
- **Collect reviews** — After every delivery, ask the client for a Google review. Word of mouth and reviews are your most powerful marketing tool at this stage.

## Phase 4 — Growth (Month 6+)

Goal: increase income, specialize, and build a real business.

- **Pick a niche** — Agencies that specialize charge more and close deals faster. Consider focusing on one industry: restaurants, medical clinics, beauty salons, real estate agents. You become the "go-to" for that sector.
- **Add-on services** — Upsell to existing clients: SEO setup, Google Business profile optimization, Instagram content creation, logo design. More value per client, same relationship.
- **Track your numbers** — Know your average revenue per client, how many hours each site takes, and where your leads come from. This tells you what to do more of.
- **Register your business** — Once revenue is steady, register in Israel as עוסק פטור (up to ~₪120,000/year) or עוסק מורשה (above that). A local accountant can help and costs very little.

## Your Competitive Advantage

Using Claude Code, you can deliver a professional website in hours rather than the days or weeks a typical freelancer takes. This means:

- Lower prices than agencies
- Faster turnaround than freelancers
- Higher profit margin for you

The key is building great templates once, then reusing them efficiently for every client.

## Tools

- **Claude Code** — Build and customize websites fast
- **GitHub** — Collaborate with your partner, one repo per client
- **Git** — Keep work in sync between the two of you
- **Google Workspace or Notion** — Client communication and project tracking
- **Domain registrar** (e.g. GoDaddy, Namecheap) — Buy domains for clients
- **Hosting provider** (e.g. Netlify, Vercel, or shared hosting) — Host client sites

## Templates

- **Template 1 — Landing Page**: A single beautiful page to present the business and get people to call or book. Sections: hero (big photo + tagline + CTA button), services list, about/story, gallery, testimonials, contact + map. All content comes from a `client.json` config file — swap the file, the whole site updates.
- **Template 2 — Booking & Customer Management**: A multi-page site: landing page + an appointment booking page where customers pick a service, date, and time. The business owner gets a simple admin view to see upcoming appointments. Built with plain HTML + a free backend like Google Sheets (via a form) or a free tool like Calendly embedded. No database coding needed.
- **Template 3 — Service Payments**: Landing page + a "pay now" / "leave a deposit" page. Uses Stripe or Apple Pay — both have simple embed codes, no backend needed. Client can invoice customers or collect a deposit before an appointment. Works great for salons (deposit to confirm booking) and gyms (monthly membership payment).
