export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://ebony-bruce-production.up.railway.app',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  googleAiApiKey: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ?? '',
  paymentModel: (process.env.NEXT_PUBLIC_PAYMENT_MODEL ?? 'merchant') as 'merchant' | 'direct',
  
  // Wakanow configuration for domestic flights
  wakanow: {
    baseUrl: process.env.NEXT_PUBLIC_WAKANOW_BASE_URL ?? 'https://wakanow-api-affiliate-b2b-devtest-test.azurewebsites.net',
    username: process.env.NEXT_PUBLIC_WAKANOW_USERNAME ?? '15a9efddb90c4a678768b8bf78707afa',
    password: process.env.NEXT_PUBLIC_WAKANOW_PASSWORD ?? '_0GZIjuqlC',
  },
} as const;

export const apiUrl = (path: string) =>
  `${config.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;