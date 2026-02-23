# Ebony Bruce Travels Booking System Website

**A Modern Online Travel Agency (OTA) Platform**

---

## Contact Information

**Address:** 6th Floor Lister Building, Ring Road, Ibadan, Oyo State  
**Email:** info@cortouchmedia.com.ng  
**Phone:** +2348067473244  
**Date:** December 17, 2025  
**Estimated Project Duration:** 8 Weeks

---

## 1. Executive Summary

This proposal outlines the design and development of a modern, full-featured online travel agency (OTA) platform that allows customers to search and book flights (domestic & international), hotels, and car rentals worldwide in one place.

The platform will compete directly with Wakanow, Travelstart, Booking.com, and international players by offering:

- Real-time access to 380+ international airlines and millions of hotels
- Full coverage of Nigerian domestic flights (Air Peace, Arik Air, Ibom Air, Green Africa, United Nigeria, etc.)
- Car rental options in 50,000+ locations
- Fast, mobile-first experience
- Secure Naira and multi-currency payments
- Built-in profit markup system
- 24/7 AI-powered customer support

Built on the latest web technologies (Next.js 14, TypeScript, Tailwind CSS), the solution delivers superior performance, SEO, and lower long-term maintenance costs compared to traditional PHP/WordPress setups.

### Key Differentiators

- **One-stop booking:** Domestic + International Flights + Hotels + Cars
- **Best local rates** via dedicated Nigerian partner (Trips Africa API)
- **Premium international coverage** via Duffel API
- **No IATA license required** (handled by providers)
- **Rapid launch** in 8–10 weeks
- **Full ownership** of custom code
- **Higher margins** through flexible markup controls
- **AI-powered customer care widget** for instant support

---

## 2. Platform Overview

### 2.1 Customer Web Application

- Fully responsive website (desktop, tablet, mobile)
- Page load times under 2 seconds
- Clean, intuitive UI with tabbed search (Flights / Hotels / Cars / Packages)

### 2.2 24/7 AI-Powered Customer Care Widget

- Embedded live chat widget (powered by Tidio, Intercom, or Crisp – customizable)
- AI chatbot handles 80%+ of common queries instantly (e.g., baggage rules, visa info, booking changes, refunds)
- Pre-trained on travel FAQs + your platform-specific knowledge base
- Seamless escalation to human support (email or WhatsApp)
- Multi-language support (English primary, with French/Arabic options ready)

### 2.3 Administrative Dashboard

- Real-time view of all bookings (flights, hotels, cars)
- Revenue analytics and export reports
- Markup & service fee management
- Booking management and customer support tools
- Unified view of domestic and international bookings

---

## 3. Technical Architecture

### Frontend

- **Next.js 14+** (App Router, Server Components)
- **TypeScript**
- **Tailwind CSS** + Shadcn/ui components
- Mobile-first responsive design
- SEO-optimized (SSR)

### Backend

- **NestJS 10+** (TypeScript-first, enterprise-grade framework)
- **Domain-Driven Design (DDD)** architecture
- **Prisma ORM** + PostgreSQL (Railway/Supabase)
- Secure proxy for all external APIs
- RESTful API with Swagger documentation

---

## 3.1 Backend Architecture & Critical Decisions

### Backend Framework Decision Required

**⚠️ URGENT:** Choose backend framework before development starts.

**Recommendation: NestJS**
- Built for TypeScript and complex backends
- Excellent for your booking system's complex workflows
- Built-in features: Guards (auth), Pipes (validation), Interceptors (logging)
- Better structure for team collaboration
- Easy to scale and maintain
- Perfect for multiple API integrations and webhook handling

**Alternative: Express.js**
- Simpler and faster to start
- More flexibility but requires more setup
- Good if team prefers minimal structure

**See `BACKEND_FRAMEWORK_COMPARISON.md` for detailed analysis.**

### Database Provider Decision Required

**⚠️ ACTION REQUIRED:** Choose between Railway or Supabase before development starts.

- **Recommendation: Supabase** (PostgreSQL + built-in auth + real-time + storage)
  - Built-in authentication (JWT-based)
  - Real-time subscriptions for admin dashboard
  - File storage for PDF tickets/vouchers
  - Row-level security policies
  - Free tier suitable for MVP

- **Alternative: Railway** (PostgreSQL only)
  - More control, but requires separate auth setup
  - Better for scaling, but more setup overhead

### Authentication & Authorization

**⚠️ CRITICAL:** Authentication strategy must be defined before user table design.

- **Recommended:** NextAuth.js (Auth.js) v5 with Prisma adapter
  - Supports email/password, OAuth (Google, Facebook)
  - Session management
  - Role-based access control (Customer, Admin, SuperAdmin)
  - JWT tokens for API authentication

- **User Roles:**
  - `CUSTOMER` - Can create bookings, view own bookings
  - `ADMIN` - Full access to dashboard, bookings, markups
  - `SUPER_ADMIN` - System configuration access

- **Admin API auth (protected routes):** For all admin sign-in and sign-out, use the dedicated admin auth endpoints so only administrators can obtain a token:
  - `POST /api/v1/admin/auth/login` — email + password; only ADMIN/SUPER_ADMIN succeed (customers get 403). Rate-limited.
  - `POST /api/v1/admin/auth/logout` — requires valid admin JWT.
  - Customer auth remains at `POST /api/v1/auth/login` and `POST /api/v1/auth/logout`. See the API/Postman collection for full details.

### API Structure & Standards

- **API Versioning:** `/api/v1/` prefix for future-proofing
- **Error Handling:** Standardized error responses with error codes
- **Rate Limiting:** Implement per-route (e.g., 100 req/min for search, 10 req/min for booking)
- **CORS:** Configure for production domains only
- **Request Validation:** Zod schemas for all API inputs
- **Response Format:** Consistent JSON structure `{ success, data, error, message }`

### Payment Webhook Handling

**⚠️ CRITICAL:** Payment webhooks must be implemented for production.

- **Stripe Webhooks:** `/api/webhooks/stripe` - Handle payment confirmations, refunds
- **Paystack Webhooks:** `/api/webhooks/paystack` - Handle Naira payment confirmations
- **Idempotency:** Prevent duplicate webhook processing
- **Queue System:** Consider BullMQ/Redis for async webhook processing
- **Retry Logic:** Failed webhooks should retry with exponential backoff

### Multi-Currency Handling

- **Storage:** Store amounts in smallest currency unit (kobo for NGN, cents for USD)
- **Currency Field:** ISO 4217 codes (NGN, USD, GBP, EUR)
- **Exchange Rates:** Store provider base price + markup separately
- **Display:** Convert to display currency on frontend
- **Database:** Use `Decimal` type (Prisma) for all monetary values to avoid floating-point errors

### Booking Reference System

- **Format:** `EBT-{YYYYMMDD}-{6-digit-random}` (e.g., `EBT-20251217-123456`)
- **Uniqueness:** Database constraint + application-level validation
- **Searchable:** Indexed for fast admin lookup

### Booking Status Workflow

Define clear status transitions:
- `PENDING` → Payment initiated
- `PAYMENT_PENDING` → Awaiting payment confirmation
- `CONFIRMED` → Payment successful, booking confirmed with provider
- `CANCELLED` → Cancelled by user or admin
- `REFUNDED` → Cancelled and refund processed
- `FAILED` → Payment or provider booking failed

### Database Schema Considerations

- **Soft Deletes:** Use `deletedAt` timestamp instead of hard deletes for audit trail
- **Timestamps:** `createdAt`, `updatedAt` on all tables
- **Audit Trail:** Consider `auditLog` table for admin actions (markup changes, booking modifications)
- **Indexes:** Critical indexes on:
  - `bookings.reference` (unique)
  - `bookings.userId`
  - `bookings.status`
  - `bookings.createdAt` (for reports)
  - `users.email` (unique)

### Markup Configuration

- **Storage:** Separate `MarkupConfig` table with:
  - Product type (FLIGHT_DOMESTIC, FLIGHT_INTERNATIONAL, HOTEL, CAR_RENTAL)
  - Markup percentage (Decimal)
  - Service fee amount (Decimal)
  - Currency
  - Effective date range (for future changes)
  - Is active flag

### Environment Variables Structure

Required `.env` variables:
```
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# API Keys
DUFFEL_API_KEY="..."
TRIPS_AFRICA_API_KEY="..."
BOOKING_COM_API_KEY="..."

# Payments
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."
PAYSTACK_SECRET_KEY="..."
PAYSTACK_WEBHOOK_SECRET="..."

# Email
RESEND_API_KEY="..." # or SENDGRID_API_KEY

# External Services
TIDIO_API_KEY="..." # or CRISP_API_KEY
```

### Logging & Monitoring

- **Structured Logging:** Use Pino or Winston
- **Error Tracking:** Integrate Sentry or LogRocket
- **API Monitoring:** Track response times, error rates
- **Database Monitoring:** Query performance, connection pool status

### Testing Strategy

- **Unit Tests:** Jest for business logic
- **Integration Tests:** Test API routes with test database
- **E2E Tests:** Playwright for critical user flows (booking, payment)
- **Test Database:** Separate test DB for CI/CD

### Data Migration Strategy

- **Prisma Migrate:** Use for schema changes
- **Migration Naming:** `YYYYMMDDHHMMSS_description`
- **Backup Before Migration:** Always backup production before migrations
- **Rollback Plan:** Document rollback steps for each migration

### Security Checklist

- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (Prisma handles this)
- ✅ XSS prevention (sanitize user inputs)
- ✅ CSRF protection (NextAuth includes this)
- ✅ Rate limiting on public endpoints
- ✅ API key rotation plan
- ✅ Secrets management (use Vercel env vars, never commit)
- ✅ HTTPS only in production
- ✅ Database connection pooling

---

## 4. Integrations & Infrastructure

### Travel Providers

- **International Flights & Hotels:** Duffel API (380+ airlines + millions of properties via Duffel Stays)
- **Domestic Nigerian Flights:** Trips Africa API (full real-time coverage of Air Peace, Arik Air, Ibom Air, Green Africa, United Nigeria, and more)
- **Car Rentals:** Booking.com Demand API (affiliate model, 50,000+ locations)

### Payments

- **Stripe** (global cards, multi-currency)
- **Paystack** integration ready (for Naira payments)

### Customer Care

- **AI Chat Widget:** Tidio or Crisp (easy embed, AI rules engine)

### Communications

- Email confirmations (Resend or SendGrid)
- PDF e-tickets & vouchers

### Hosting & Security

- **Backend:** Railway (recommended) or Render
- **Database:** Supabase or Railway PostgreSQL
- **Frontend:** Vercel (separate repo)
- **Cloudflare** protection (optional)
- Free SSL (automatic)
- Daily automated backups

---

## 5. Key Features

### Customer Features

- **Tabbed search:** Flights (one-way, return, multi-city – automatically routes domestic queries to Trips Africa API for best local pricing)
- Advanced filters and sorting
- Transparent pricing with itemized breakdown
- **Add-ons:** extra baggage, seats (flights), room options (hotels), extras (cars)
- Unified basket for multi-product bookings
- Secure checkout in Naira or USD
- Instant confirmation with PDF tickets/vouchers
- 24/7 AI chat support available on every page

### Admin Features

- Dashboard with all bookings (filter by product, date, status, domestic/international)
- Revenue reports and CSV export
- Configurable markup % and service fees per product
- Booking search and manual assistance tools
- View and manage chat transcripts

---

## 6. Coverage

### Airlines

- **Domestic Nigeria:** Full coverage via Trips Africa API – Air Peace, Arik Air, Ibom Air, Green Africa, United Nigeria, Overland Airways, Max Air, etc.
- **International:** 380+ global carriers via Duffel – British Airways, Emirates, Qatar Airways, Ethiopian Airlines, Kenya Airways, South African Airways, Lufthansa, KLM, Turkish Airlines, and more.

### Hotels

Millions of properties worldwide via Duffel Stays.

### Cars

50,000+ pickup locations globally via Booking.com partners.

### Popular Routes Supported

- **Domestic Nigeria:** Lagos–Abuja, Lagos–Port Harcourt, Abuja–Enugu, etc.
- **UK ↔ Africa:** London to Lagos, Abuja, Nairobi, Accra, Johannesburg
- Intra-Africa and global connectivity

---

## 7. Revenue Model & Profitability

### Markup Structure (Fully Configurable)

- **Domestic & International Flights:** 8–15% markup (recommended 10%)
- **Hotels:** 10–20% markup
- **Car Rentals:** Affiliate commission + optional service fee
- **Extra baggage/seats:** ₦5,000–₦15,000 flat markup
- **Service fee:** ₦5,000–₦10,000 per booking

### Example Transaction (London–Lagos Roundtrip – International)

| Component | Amount (Approx) |
|-----------|----------------|
| Duffel Base Price | ₦1,200,000 |
| Platform Markup (10%) | ₦120,000 |
| Service Fee | ₦10,000 |
| **Customer Pays** | **₦1,330,000** |
| **Your Profit** | **₦129,000+** |

### Example Transaction (Lagos–Abuja Roundtrip – Domestic)

| Component | Amount (Approx) |
|-----------|----------------|
| Trips Africa Base | ₦150,000 |
| Platform Markup (10%) | ₦15,000 |
| Service Fee | ₦5,000 |
| **Customer Pays** | **₦170,000** |
| **Your Profit** | **₦19,000+** |

**Net margin:** ~9–12% per booking + ancillary revenue + reduced support costs via AI chat.

---

## 8. Development Timeline (8-10 Weeks)

- **Weeks 1–2:** UI/UX Design & Branding (Figma handoff)
- **Weeks 3–5:** Core Backend + Duffel (International) & Trips Africa (Domestic) Flights + Hotels Integration
- **Weeks 6–7:** Frontend + Car Rentals + AI Customer Care Widget + Unified Checkout
- **Weeks 8–9:** Admin Dashboard + Testing
- **Week 10:** Final Revisions, Launch & Handover

---

## 9. Post-Launch Support

### Free (3 Months)

- Bug fixes
- Performance optimization
- AI chatbot tuning and FAQ updates
- Minor feature tweaks

---

## 10. Success Metrics (KPIs)

- **99.9% uptime**
- **Page load < 2 seconds**
- **Booking conversion rate:** 3–6%
- **AI chat resolution rate:** 80%+
- **Customer satisfaction (NPS):** 50+
- **First 100 bookings** within 3 months post-launch

---

## License

Proprietary - All rights reserved.

---

## Contact

For inquiries about this project, please contact:

**Cortouch Media**  
6th Floor Lister Building  
Ring Road, Ibadan, Oyo State  
Email: info@cortouchmedia.com.ng  
Phone: +2348067473244

