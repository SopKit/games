import { promises as fs } from 'fs';
import path from 'path';
import { Game } from '../../../types';

export const dynamic = 'force-static';

async function getGames(): Promise<Game[]> {
    const filePath = path.join(process.cwd(), 'public', 'games.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents);
}

export async function generateStaticParams() {
    const games = await getGames();
    return games.map((game) => ({
        slug: game.slug,
    }));
}

interface EmbedProps {
    params: Promise<{ slug: string }>;
}

export default async function EmbedPage({ params }: EmbedProps) {
    const { slug } = await params;
    const games = await getGames();
    const game = games.find((g) => g.slug === slug);

    if (!game) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#02000f',
                color: '#fff',
                fontFamily: 'sans-serif'
            }}>
                Game Not Found
            </div>
        );
    }

    return (
        <iframe
            src={game.embedUrl}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#000',
            }}
            allowFullScreen
            scrolling="no"
        />
    );
}
