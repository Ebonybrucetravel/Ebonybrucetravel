export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://ebony-bruce-production.up.railway.app',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  googleAiApiKey: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ?? '',
  paymentModel: (process.env.NEXT_PUBLIC_PAYMENT_MODEL ?? 'merchant') as 'merchant' | 'direct', 
} as const;

export const apiUrl = (path: string) =>
  `${config.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;