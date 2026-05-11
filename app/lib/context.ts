import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';

// Define the additional context object
const additionalContext = {
  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
  // These will be available as both context.propertyName and context.get(propertyContext)
  // Example of complex objects that could be added:
  // cms: await createCMSClient(env),
  // reviews: await createReviewsClient(env),
} as const;

/**
 * Maps the incoming request's hostname to a Shopify locale (language + country).
 *
 * Production domain ↔ locale mapping (matches the Markets config in Shopify admin):
 *   rolscarpets.eu  → EN/ES  (International market: EU-27 except FR/IT, English language, ES as default country code)
 *   rolscarpets.fr  → FR/FR  (France market)
 *   rolscarpets.it  → IT/IT  (Italy market)
 *
 * Dev/preview URLs (Oxygen *.myshopify.dev, localhost, etc.) fall through to the EN/ES default
 * so local development and preview deploys behave like the International market.
 *
 * `www.` prefix is normalized so both apex and www variants map to the same locale.
 */
function getLocaleFromRequest(request: Request) {
  const hostname = new URL(request.url).hostname.replace(/^www\./, '');

  switch (hostname) {
    case 'rolscarpets.fr':
      return {language: 'FR', country: 'FR'} as const;
    case 'rolscarpets.it':
      return {language: 'IT', country: 'IT'} as const;
    case 'rolscarpets.eu':
    default:
      return {language: 'EN', country: 'ES'} as const;
  }
}

// Automatically augment HydrogenAdditionalContext with the additional context type
type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
}

/**
 * Creates Hydrogen context for React Router 7.9.x
 * Returns HydrogenRouterContextProvider with hybrid access patterns
 * */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: getLocaleFromRequest(request),
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  );

  return hydrogenContext;
}
