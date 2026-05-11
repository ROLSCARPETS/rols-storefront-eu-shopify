import type {Route} from './+types/[robots.txt]';

/**
 * robots.txt — currently set to BLOCK all indexing while the storefront is in development.
 *
 * ⚠️ BEFORE LAUNCHING TO PRODUCTION:
 *   Flip `ALLOW_INDEXING` to `true`. This will switch to the Shopify-style production
 *   robots.txt below (with sitemap reference and standard ecommerce disallow rules).
 *
 * Why we don't rely on Shopify's password-protect: that only applies to the default
 * theme, not the Hydrogen storefront. With our domains routed to Hydrogen, the only
 * gate against accidental Google indexing is this file.
 */
const ALLOW_INDEXING = false;

export function loader({request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const body = ALLOW_INDEXING
    ? productionRobotsTxt({sitemapUrl: `${url.origin}/sitemap.xml`})
    : devNoIndexRobotsTxt();

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      // Short cache during dev so toggling ALLOW_INDEXING propagates fast.
      'Cache-Control': ALLOW_INDEXING ? `max-age=${60 * 60 * 24}` : 'max-age=60',
    },
  });
}

/**
 * Blanket disallow for all user agents. Used during pre-launch development.
 */
function devNoIndexRobotsTxt() {
  return `# Pre-launch: indexing disabled site-wide.
# To enable: set ALLOW_INDEXING = true in app/routes/[robots.txt].tsx
User-agent: *
Disallow: /
`;
}

/**
 * Production robots.txt — mirrors Shopify Online Store defaults.
 * Edit cautiously: getting this wrong affects SEO directly.
 */
function productionRobotsTxt({sitemapUrl}: {sitemapUrl: string}) {
  return `
User-agent: *
${generalDisallowRules({sitemapUrl})}

# Google adsbot ignores robots.txt unless specifically named!
User-agent: adsbot-google
Disallow: /cart
Disallow: /account
Disallow: /search
Allow: /search/
Disallow: /search/?*

User-agent: Nutch
Disallow: /

User-agent: AhrefsBot
Crawl-delay: 10
${generalDisallowRules({sitemapUrl})}

User-agent: AhrefsSiteAudit
Crawl-delay: 10
${generalDisallowRules({sitemapUrl})}

User-agent: MJ12bot
Crawl-Delay: 10

User-agent: Pinterest
Crawl-delay: 1
`.trim();
}

function generalDisallowRules({sitemapUrl}: {sitemapUrl: string}) {
  return `Disallow: /cart
Disallow: /account
Disallow: /collections/*sort_by*
Disallow: /*/collections/*sort_by*
Disallow: /collections/*+*
Disallow: /collections/*%2B*
Disallow: /collections/*%2b*
Disallow: /*/collections/*+*
Disallow: /*/collections/*%2B*
Disallow: /*/collections/*%2b*
Disallow: /*/collections/*filter*&*filter*
Disallow: /blogs/*+*
Disallow: /blogs/*%2B*
Disallow: /blogs/*%2b*
Disallow: /*/blogs/*+*
Disallow: /*/blogs/*%2B*
Disallow: /*/blogs/*%2b*
Disallow: /policies/
Disallow: /search
Allow: /search/
Disallow: /search/?*
Sitemap: ${sitemapUrl}`;
}
