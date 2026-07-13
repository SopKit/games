import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE_URL = 'https://sopkit.github.io/games';

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
