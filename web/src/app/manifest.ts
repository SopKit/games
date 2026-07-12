import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'SOP Games - Free Online Games',
        short_name: 'SOP Games',
        description: 'Play thousands of free online games instantly. Cinematic experience, no downloads.',
        start_url: '/games/',
        scope: '/games/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#02000f',
        theme_color: '#02000f',
        icons: [
            {
                src: '/games/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/games/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/games/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/games/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
