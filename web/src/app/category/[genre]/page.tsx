import { promises as fs } from 'fs';
import path from 'path';
import { Game } from '../../../types';
import { GameGrid } from '../../../components/GameGrid';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Metadata } from 'next';

const BASE_URL = 'http://sopkit.github.io/games';

export const dynamic = 'force-static';

async function getGames(): Promise<Game[]> {
    const filePath = path.join(process.cwd(), 'public', 'games.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents);
}

function slugifyCategory(category: string): string {
    return category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function generateStaticParams() {
    const games = await getGames();
    const categories = Array.from(new Set(games.map(g => g.category || 'Casual')));
    return categories.map(cat => ({
        genre: slugifyCategory(cat)
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ genre: string }> }): Promise<Metadata> {
    const { genre } = await params;
    const games = await getGames();
    
    // Find the original category name matching this slug
    const originalCategory = games.find(g => slugifyCategory(g.category || 'Casual') === genre)?.category || 'Games';
    
    return {
        title: `${originalCategory} Games - Play Free Online | SOP Games`,
        description: `Play the best free online ${originalCategory} games. No downloads required, play instantly in your browser!`,
        alternates: {
            canonical: `${BASE_URL}/category/${genre}`
        }
    };
}

interface CategoryProps {
    params: Promise<{ genre: string }>;
}

export default async function CategoryPage({ params }: CategoryProps) {
    const { genre } = await params;
    const games = await getGames();
    
    const categoryGames = games.filter(g => slugifyCategory(g.category || 'Casual') === genre);
    const originalCategory = categoryGames[0]?.category || 'Games';

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': `${originalCategory} Games`,
        'numberOfItems': categoryGames.length,
        'itemListElement': categoryGames.slice(0, 100).map((game, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'url': `${BASE_URL}/game/${game.slug}`,
            'name': game.name,
            'image': game.image
        }))
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
            />
            <main className="min-h-screen bg-background text-foreground py-12 px-4 md:px-8 relative overflow-hidden">
                <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                    {/* Header bar */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group">
                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-all border border-white/5 group-hover:border-white/20">
                                <ChevronLeft className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
                        </Link>
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                            {originalCategory} Games
                        </h1>
                        <span className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                            {categoryGames.length} Titles
                        </span>
                    </div>

                    {/* Games Grid */}
                    <div className="min-h-[500px]">
                        <GameGrid games={categoryGames} />
                    </div>
                </div>
            </main>
        </>
    );
}
