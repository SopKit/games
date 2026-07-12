import { promises as fs } from 'fs';
import path from 'path';
import { Game } from '../../../types';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Star } from 'lucide-react';
import { GameInteractions } from '../../../components/GameInteractions';

const BASE_URL = 'http://sopkit.github.io/games';

let gamesCache: Game[] | null = null;

async function getGames(): Promise<Game[]> {
    if (gamesCache) return gamesCache;
    try {
        // Try file system first (Works at build time & local dev)
        const filePath = path.join(process.cwd(), 'public', 'games.json');
        const fileContents = await fs.readFile(filePath, 'utf8');
        gamesCache = JSON.parse(fileContents);
        return gamesCache!;
    } catch (error) {
        // Fallback to network fetch (Works at runtime on Cloudflare)
        console.log('Falling back to network fetch for games.json');
        const res = await fetch(`${BASE_URL}/games.json`, { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error('Failed to fetch game data');
        gamesCache = await res.json();
        return gamesCache!;
    }
}

export async function generateStaticParams() {
    const games = await getGames();
    const isStaticExport = process.env.GITHUB_ACTIONS === "true" || process.env.EXPORT_STATIC === "true";
    
    // For static hosting like GitHub Pages, we must pre-render all games
    const gamesToRender = isStaticExport ? games : games.slice(0, 200);
    
    return gamesToRender.map((game) => ({
        slug: game.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const games = await getGames();
    const game = games.find((g) => g.slug === slug);

    if (!game) return { title: 'Game Not Found' };

    return {
        title: `${game.name} - Play Online for Free`,
        description: `Play ${game.name} online for free. No download required. Rated ${parseFloat(game.rating).toFixed(1)}/5.`,
        openGraph: {
            images: [game.image],
            url: `${BASE_URL}/game/${slug}`,
            type: 'website',
        },
        alternates: {
            canonical: `${BASE_URL}/game/${slug}`,
        },
    };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const games = await getGames();
    const game = games.find((g) => g.slug === slug);

    if (!game) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <h1 className="text-2xl">Game not found</h1>
            </div>
        );
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Home',
                        item: BASE_URL,
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Games',
                        item: `${BASE_URL}/#catalog`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: game.name,
                        item: `${BASE_URL}/game/${slug}`,
                    },
                ],
            },
            {
                '@type': 'VideoGame',
                name: game.name,
                description: `Play ${game.name} online for free on SOP Games. No download required.`,
                image: game.image,
                url: `${BASE_URL}/game/${slug}`,
                datePublished: '2023-01-01', // Fallback as we don't have date
                genre: ['Game', 'Arcade', 'Casual'],
                playMode: 'SinglePlayer',
                applicationCategory: 'Game',
                operatingSystem: 'Any',
                aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: game.rating,
                    ratingCount: 100,
                    bestRating: 5,
                    worstRating: 1,
                },
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                    availability: 'https://schema.org/InStock',
                },
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
                {/* Cinematic Background */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/40 z-10" />
                    <div
                        className="w-full h-full opacity-40 blur-[100px] scale-125 saturate-150"
                        style={{
                            backgroundImage: `url(${game.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                </div>

                <nav className="relative z-50 p-4 border-b border-white/5 bg-background/20 backdrop-blur-xl sticky top-0">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group">
                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-all border border-white/5 group-hover:border-white/20">
                                <ChevronLeft className="w-5 h-5" />
                            </div>
                            <span className="font-medium hidden sm:inline">Back to Browse</span>
                        </Link>
                        <h1 className="font-bold text-lg text-white/90 truncate max-w-[200px] md:max-w-md">{game.name}</h1>
                        <div className="w-10 md:w-24" />
                    </div>
                </nav>

                <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 gap-8 relative z-20 container mx-auto max-w-7xl">
                    {/* Game Container */}
                    <div className="w-full aspect-video bg-black/90 rounded-2xl overflow-hidden shadow-2xl shadow-primary/5 ring-1 ring-white/10 relative group">
                        <iframe
                            src={game.embedUrl}
                            className="w-full h-full border-0"
                            allowFullScreen
                            loading="eager" // Load game immediately
                            title={game.name}
                        />
                    </div>

                    {/* Metadata & Actions */}
                    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div>
                                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{game.name}</h1>

                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <span className="bg-gradient-to-r from-primary/80 to-purple-500/80 text-white px-4 py-1.5 rounded-full font-bold shadow-lg shadow-primary/20 backdrop-blur-md border border-white/10">
                                        Free to Play
                                    </span>
                                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 backdrop-blur-md">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="font-bold">{parseFloat(game.rating).toFixed(1)}</span>
                                    </div>
                                    <span className="text-muted-foreground">HTML5 • Mobile Friendly</span>
                                </div>
                            </div>

                            <p className="text-lg text-gray-300 leading-relaxed max-w-3xl">
                                Play <strong>{game.name}</strong> instantly in your browser.
                                No downloads, no installation using <span className="text-white font-semibold">SOP Games</span>.
                                Experience seamless gameplay optimized for all devices.
                            </p>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="p-6 rounded-3xl bg-card/20 backdrop-blur-xl border border-white/10 shadow-xl">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Game Controls</h3>
                                <GameInteractions game={game} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
