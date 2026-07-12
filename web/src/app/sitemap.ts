import { MetadataRoute } from 'next';
import { Game } from '../types';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

const BASE_URL = 'http://sopkit.github.io/games';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    let games: Game[] = [];
    try {
        // Try file system first (Works at build time & local dev)
        const filePath = path.join(process.cwd(), 'public', 'games.json');
        const fileContents = await fs.readFile(filePath, 'utf8');
        games = JSON.parse(fileContents);
    } catch (error) {
        // Fallback to network fetch
        try {
            const response = await fetch(`${BASE_URL}/games.json`, { next: { revalidate: 3600 } });
            if (response.ok) {
                games = await response.json();
            }
        } catch (fetchError) {
            console.error('Failed to fetch games for sitemap:', fetchError);
        }
    }

    const gameUrls = games.map((game) => ({
        url: `${BASE_URL}/game/${game.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    }));

    return [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...gameUrls,
    ];
}
