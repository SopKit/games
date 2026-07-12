import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE_URL = 'https://sopgames.30tools.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
