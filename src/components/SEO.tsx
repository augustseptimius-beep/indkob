import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Klitmøllers Indkøbsfællesskab';
const DEFAULT_DESCRIPTION = 'Fælles indkøb af kvalitetsvarer i Klitmøller. Spar penge og reducer spild ved at købe sammen.';
const DEFAULT_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/DftBSJn2IHhc7XKT9IHeDqK8xaj1/social-images/social-1774073267634-Screenshot_2026-03-21_at_07.07.00.webp';
const SITE_URL = 'https://indkob.lovable.app';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  noindex?: boolean;
  type?: 'website' | 'article' | 'product';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  canonical,
  noindex = false,
  type = 'website',
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* OpenGraph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="da_DK" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
