"use client";

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Game } from '../types';
import { GameGrid } from './GameGrid';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, ChevronDown, Sparkles, Trophy, Gamepad2, Zap, Star } from 'lucide-react';
import { getBrowserStorage, getMostPlayed, readGameList } from '../lib/browser-storage';

const fetcher = async (url: string): Promise<Game[]> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load game catalog (${response.status}).`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('Game catalog must be an array.');
    return payload as Game[];
};

const GAMES_PER_PAGE = 50;

interface GameCatalogProps {
    initialGames: Game[];
}

function parsePage(value: string | null): number {
    if (!value || !/^[1-9]\d*$/.test(value)) return 1;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : 1;
}

export function GameCatalog({ initialGames }: GameCatalogProps) {
    const { data: games } = useSWR<Game[]>('/games/games.json', fetcher, {
        fallbackData: initialGames,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const search = searchParams.get('search') || '';
    const requestedSort = searchParams.get('sort');
    const sort: 'rating' | 'newest' = requestedSort === 'newest' ? 'newest' : 'rating';
    const requestedPage = parsePage(searchParams.get('page'));

    const [searchQuery, setSearchQuery] = useState(search);
    const [randomGames, setRandomGames] = useState<Game[]>([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState<Game[]>([]);
    const [favorites, setFavorites] = useState<Game[]>([]);
    const [mostPlayed, setMostPlayed] = useState<Game[]>([]);

    useEffect(() => {
        setSearchQuery(search);
    }, [search]);

    useEffect(() => {
        const storage = getBrowserStorage();
        if (!storage) return;
        setRecentlyPlayed(readGameList(storage, 'recently-played'));
        setFavorites(readGameList(storage, 'favorites'));
        setMostPlayed(getMostPlayed(storage));
    }, []);

    useEffect(() => {
        const allGames = games || initialGames;
        if (allGames.length > 0 && randomGames.length === 0) {
            setRandomGames([...allGames].sort(() => Math.random() - 0.5).slice(0, 5));
        }
    }, [games, initialGames, randomGames.length]);

    const shuffleRandomGames = () => {
        const allGames = games || initialGames;
        if (allGames.length > 0) {
            setRandomGames([...allGames].sort(() => Math.random() - 0.5).slice(0, 5));
        }
    };

    useEffect(() => {
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }, [requestedPage]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (searchQuery === search) return;
            const params = new URLSearchParams(searchParams.toString());
            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            else params.delete('search');
            params.set('page', '1');
            router.push(pathname + '?' + params.toString(), { scroll: false });
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchQuery, search, searchParams, router, pathname]);

    const createQueryString = useCallback((name: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(name, value);
        if (name !== 'page') params.set('page', '1');
        return params.toString();
    }, [searchParams]);

    const updateState = (name: string, value: string) => {
        router.push(pathname + '?' + createQueryString(name, value), { scroll: false });
    };

    const filteredGames = useMemo(() => {
        let result = [...(games || initialGames)];
        if (searchQuery.trim()) {
            const lowerSearch = searchQuery.trim().toLocaleLowerCase();
            result = result.filter((game) => game.name.toLocaleLowerCase().includes(lowerSearch));
        }

        if (sort === 'rating') {
            result.sort((a, b) => {
                const ratingA = Number.parseFloat(a.rating);
                const ratingB = Number.parseFloat(b.rating);
                return (Number.isFinite(ratingB) ? ratingB : -1) -
                    (Number.isFinite(ratingA) ? ratingA : -1);
            });
        } else {
            result.sort((a, b) => {
                const idA = Number(a.id);
                const idB = Number(b.id);
                return (Number.isFinite(idB) ? idB : -1) - (Number.isFinite(idA) ? idA : -1);
            });
        }
        return result;
    }, [games, initialGames, searchQuery, sort]);

    const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
    const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
    const currentGames = filteredGames.slice((page - 1) * GAMES_PER_PAGE, page * GAMES_PER_PAGE);

    useEffect(() => {
        if (page !== requestedPage) updateState('page', String(page));
    }, [page, requestedPage]);

    return (
        <div className="space-y-8 animate-fade-in-up delay-300">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 p-6 rounded-3xl bg-card/25 backdrop-blur-xl border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 pointer-events-none" />
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                                Random Picks for You
                            </h2>
                            <p className="text-xs text-muted-foreground">Fresh titles selected dynamically. Roll for new games!</p>
                        </div>
                        <button onClick={shuffleRandomGames} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/40 text-xs font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-black/20">
                            <Trophy className="w-3.5 h-3.5" />
                            Roll Again
                        </button>
                    </div>
                    {randomGames.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            {randomGames.map((game) => (
                                <Link href={`/game/${game.slug}`} key={game.id} className="group/card flex flex-col space-y-2 relative">
                                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/50 border border-white/5 group-hover/card:border-primary/40 shadow-md transition-all relative">
                                        <img src={game.image} alt={game.name} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-300" loading="lazy" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                                            <Gamepad2 className="w-8 h-8 text-primary transform scale-75 group-hover/card:scale-100 transition-transform duration-300" />
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-white/80 group-hover/card:text-primary truncate px-1">{game.name}</span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">Loading picks...</div>
                    )}
                </div>

                <div className="xl:col-span-1 p-6 rounded-3xl bg-card/25 backdrop-blur-xl border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="space-y-1 border-b border-white/5 pb-4">
                            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
                                Play Dashboard
                            </h2>
                            <p className="text-xs text-muted-foreground">Your custom play history and library.</p>
                        </div>
                        <div className="space-y-4 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                            {recentlyPlayed.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Recently Played</span>
                                    <div className="flex flex-wrap gap-2">
                                        {recentlyPlayed.slice(0, 4).map((game) => (
                                            <Link href={`/game/${game.slug}`} key={game.id} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-xl transition-all group/item text-xs font-bold text-white/80 hover:text-white">
                                                <span className="w-2 h-2 rounded-full bg-primary group-hover/item:animate-none" />
                                                <span className="truncate max-w-[120px]">{game.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {favorites.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Your Favorites</span>
                                    <div className="flex flex-wrap gap-2">
                                        {favorites.slice(0, 4).map((game) => (
                                            <Link href={`/game/${game.slug}`} key={game.id} className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/10 hover:border-yellow-500/20 px-3 py-1.5 rounded-xl transition-all text-xs font-bold text-yellow-500">
                                                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                                <span className="truncate max-w-[120px]">{game.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {mostPlayed.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Most Played</span>
                                    <div className="flex flex-wrap gap-2">
                                        {mostPlayed.slice(0, 4).map((game) => (
                                            <Link href={`/game/${game.slug}`} key={game.id} className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/10 hover:border-purple-500/20 px-3 py-1.5 rounded-xl transition-all text-xs font-bold text-purple-400">
                                                <Trophy className="w-3.5 h-3.5 text-purple-400" />
                                                <span className="truncate max-w-[120px]">{game.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {recentlyPlayed.length === 0 && favorites.length === 0 && mostPlayed.length === 0 && (
                                <div className="py-6 text-center text-xs text-muted-foreground">No history yet. Start playing to build your board!</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Browse by Genre</span>
                <div className="flex flex-wrap gap-2.5">
                    {[
                        { name: 'Puzzle', slug: 'puzzle' }, { name: 'Action', slug: 'action' },
                        { name: 'Hypercasual', slug: 'hypercasual' }, { name: 'Arcade', slug: 'arcade' },
                        { name: 'Sports', slug: 'sports' }, { name: 'Racing', slug: 'racing' },
                        { name: 'Adventure', slug: 'adventure' }, { name: 'Shooting', slug: 'shooting' },
                        { name: 'Cooking', slug: 'cooking' }, { name: 'Multiplayer', slug: 'multiplayer' },
                        { name: 'Clicker', slug: 'clicker' }, { name: '3D', slug: '3d' },
                        { name: 'Soccer', slug: 'soccer' },
                    ].map((genre) => (
                        <Link key={genre.slug} href={`/category/${genre.slug}`} className="px-4 py-2 rounded-xl bg-card/25 hover:bg-primary/10 border border-white/5 hover:border-primary/30 text-xs font-bold text-white/80 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-md">
                            {genre.name}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/35 backdrop-blur-xl p-3 rounded-2xl border border-white/5 shadow-2xl ring-1 ring-white/5">
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    </div>
                    <input type="text" placeholder="Search games..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="block w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 text-foreground placeholder-muted-foreground border border-white/10 focus:outline-none focus:bg-white/10 focus:border-accent/40 focus:ring-2 focus:ring-accent/20 transition-all sm:text-sm" />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto px-2">
                    <span className="hidden md:inline text-sm font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">{filteredGames.length.toLocaleString()} Games</span>
                    <div className="relative">
                        <select value={sort} onChange={(event) => updateState('sort', event.target.value)} className="appearance-none w-full md:w-40 bg-white/5 border border-white/10 text-foreground py-3 pl-4 pr-10 rounded-xl leading-tight focus:outline-none focus:bg-white/10 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-sm font-semibold">
                            <option value="rating">Top Rated</option>
                            <option value="newest">Newest Added</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground"><ChevronDown className="h-4 w-4" /></div>
                    </div>
                </div>
            </div>

            <div className="min-h-[600px]">
                {currentGames.length > 0 ? (
                    <GameGrid games={currentGames} />
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <p className="text-lg">No games found matching &quot;{searchQuery}&quot;</p>
                        <button onClick={() => setSearchQuery('')} className="mt-4 text-primary hover:underline">Clear Search</button>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12 pb-12">
                    <button onClick={() => updateState('page', String(Math.max(1, page - 1)))} disabled={page === 1} className="p-3 rounded-xl bg-card/40 border border-white/5 disabled:opacity-30 hover:bg-white/10 transition-all active:scale-95 backdrop-blur-md hover:border-primary/20">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="hidden md:flex items-center gap-2 px-4 bg-card/25 backdrop-blur-md py-2 rounded-xl border border-white/5 mx-4">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                            let pageNumber = page;
                            if (totalPages <= 5) pageNumber = index + 1;
                            else if (page < 3) pageNumber = index + 1;
                            else if (page > totalPages - 2) pageNumber = totalPages - 4 + index;
                            else pageNumber = page - 2 + index;

                            return (
                                <button key={pageNumber} onClick={() => updateState('page', String(pageNumber))} className={`w-10 h-10 rounded-lg text-sm font-bold transition-all duration-300 ${page === pageNumber ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 border border-white/10' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'}`}>
                                    {pageNumber}
                                </button>
                            );
                        })}
                    </div>
                    <span className="md:hidden text-sm font-medium text-muted-foreground">Page {page} / {totalPages}</span>
                    <button onClick={() => updateState('page', String(Math.min(totalPages, page + 1)))} disabled={page === totalPages} className="p-3 rounded-xl bg-card/40 border border-white/5 disabled:opacity-30 hover:bg-white/10 transition-all active:scale-95 backdrop-blur-md hover:border-primary/20">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
