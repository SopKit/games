import { GameCatalog } from '../components/GameCatalog';
// Cinematic components
import { Game } from '../types';
import { Sparkles, Gamepad2, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

// Helper to get random game for hero background (simulated for static build)
import { promises as fs } from 'fs';
import path from 'path';

const BASE_URL = 'http://sopkit.github.io/games';

async function getGames() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'games.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents) as Game[];
  } catch {
    const res = await fetch(`${BASE_URL}/games.json`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('Failed to fetch game data');
    return res.json() as Promise<Game[]>;
  }
}

export default async function Home() {
  const games = await getGames();
  const heroGame = games[0]; // Or random, but deterministic for build

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'SOP Games',
    'url': BASE_URL,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${BASE_URL}/?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'numberOfItems': games.length,
    'itemListElement': games.slice(0, 100).map((game, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'url': `${BASE_URL}/game/${game.slug}`,
      'name': game.name,
      'image': game.image,
    })),
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {/* Immersive Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
          <div className="absolute inset-0 bg-black/60 z-10" />
          <div
            className="w-full h-full transform scale-105 animate-slow-zoom"
            style={{
              backgroundImage: `url(${heroGame.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-20 text-center max-w-4xl px-4 space-y-6">
          <div className="flex items-center justify-center gap-2 mb-4 animate-fade-in-up">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              SOP Games Portal
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-2xl animate-fade-in-up delay-100">
            Instant HTML5 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Arcade</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Access a catalog of high-quality, embeddable HTML5 games licensed directly from developers. Play instantly with no downloads and no installations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in-up delay-300">
            <Link href="#catalog" className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              Start Playing
            </Link>
            <Link href="/game/spiny-ninja" className="px-8 py-4 rounded-full bg-white/10 text-white font-semibold text-lg hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Featured Game
            </Link>
          </div>
        </div>

        {/* Stats / Features - Floating */}
        <div className="absolute bottom-10 left-0 right-0 z-20 hidden md:flex justify-center gap-12 text-white/50 animate-fade-in">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div className="flex flex-col text-left">
              <span className="text-white font-bold text-lg">2,000+</span>
              <span className="text-xs uppercase tracking-wider">Licensed Games</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-blue-500" />
            <div className="flex flex-col text-left">
              <span className="text-white font-bold text-lg">Instant Play</span>
              <span className="text-xs uppercase tracking-wider">No Setup Required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Game Catalog Section */}
      <div id="catalog" className="container mx-auto px-4 py-12 relative z-10">
        <Suspense fallback={<div className="text-white text-center py-20">Loading games...</div>}>
          <GameCatalog initialGames={games} />
        </Suspense>
      </div>
    </main>
  );
}
