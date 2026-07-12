import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'SOP Games - Free Online Games',
        short_name: 'SOP Games',
        description: 'Play thousands of free online games instantly. Cinematic experience, no downloads.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
            {
                src: '/favicon.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
            },
            {
                src: '/favicon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
            },
        ],
    };
}
