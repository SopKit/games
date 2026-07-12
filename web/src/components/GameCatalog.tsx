"use client";

import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Game } from '../types';
import { GameGrid } from './GameGrid';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const GAMES_PER_PAGE = 50;

interface GameCatalogProps {
    initialGames: Game[];
}

export function GameCatalog({ initialGames }: GameCatalogProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get State from URL
    const search = searchParams.get('search') || '';
    const sort = (searchParams.get('sort') as 'rating' | 'newest') || 'rating';
    const page = parseInt(searchParams.get('page') || '1');

    // Update URL Helper
    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set(name, value);

            // Reset page to 1 when search or sort changes
            if (name !== 'page') {
                params.set('page', '1');
            }

            return params.toString();
        },
        [searchParams]
    );

    const updateState = (name: string, value: string) => {
        router.push(pathname + '?' + createQueryString(name, value), { scroll: false });
    };

    const filteredGames = useMemo(() => {
        let result = [...initialGames];

        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter((game) =>
                game.name.toLowerCase().includes(lowerSearch)
            );
        }

        if (sort === 'rating') {
            result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        } else {
            // Fallback for "newest" using ID if date isn't available, or just keeping original order if that's implied "newest"
            // Assuming higher ID is newer for now.
            result.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        }

        return result;
    }, [initialGames, search, sort]);

    const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
    const currentGames = filteredGames.slice(
        (page - 1) * GAMES_PER_PAGE,
        page * GAMES_PER_PAGE
    );

    return (
        <div className="space-y-8 animate-fade-in-up delay-300">
            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/35 backdrop-blur-xl p-3 rounded-2xl border border-white/5 shadow-2xl ring-1 ring-white/5">
                {/* Search */}
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search 14,000+ games..."
                        defaultValue={search}
                        onChange={(e) => {
                            updateState('search', e.target.value);
                        }}
                        className="block w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 text-foreground placeholder-muted-foreground border border-white/10 focus:outline-none focus:bg-white/10 focus:border-accent/40 focus:ring-2 focus:ring-accent/20 transition-all sm:text-sm"
                    />
                </div>

                {/* Sort & Stats */}
                <div className="flex items-center gap-4 w-full md:w-auto px-2">
                    <span className="hidden md:inline text-sm font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                        {filteredGames.length.toLocaleString()} Games
                    </span>

                    <div className="relative">
                        <select
                            value={sort}
                            onChange={(e) => updateState('sort', e.target.value)}
                            className="appearance-none w-full md:w-40 bg-white/5 border border-white/10 text-foreground py-3 pl-4 pr-10 rounded-xl leading-tight focus:outline-none focus:bg-white/10 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-sm font-semibold"
                        >
                            <option value="rating">Top Rated</option>
                            <option value="newest">Newest Added</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="min-h-[600px]">
                {currentGames.length > 0 ? (
                    <GameGrid games={currentGames} />
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <p className="text-lg">No games found matching &quot;{search}&quot;</p>
                        <button
                            onClick={() => updateState('search', '')}
                            className="mt-4 text-primary hover:underline"
                        >
                            Clear Search
                        </button>
                    </div>
                )}
            </div>

            {/* Pagination - Glass Style */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12 pb-12">
                    <button
                        onClick={() => updateState('page', String(Math.max(1, page - 1)))}
                        disabled={page === 1}
                        className="p-3 rounded-xl bg-card/40 border border-white/5 disabled:opacity-30 hover:bg-white/10 transition-all active:scale-95 backdrop-blur-md hover:border-primary/20"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="hidden md:flex items-center gap-2 px-4 bg-card/25 backdrop-blur-md py-2 rounded-xl border border-white/5 mx-4">
                        {/* Simplified Pagination Logic for display */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p = page;
                            if (totalPages <= 5) {
                                p = i + 1;
                            } else if (page < 3) {
                                p = i + 1;
                            } else if (page > totalPages - 2) {
                                p = totalPages - 4 + i;
                            } else {
                                p = page - 2 + i;
                            }

                            if (p > 0 && p <= totalPages) {
                                return (
                                    <button
                                        key={p}
                                        onClick={() => updateState('page', String(p))}
                                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all duration-300 ${page === p
                                            ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 border border-white/10'
                                            : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            }
                            return null;
                        })}
                    </div>

                    {/* Mobile Page Indicator */}
                    <span className="md:hidden text-sm font-medium text-muted-foreground">
                        Page {page} / {totalPages}
                    </span>

                    <button
                        onClick={() => updateState('page', String(Math.min(totalPages, page + 1)))}
                        disabled={page === totalPages}
                        className="p-3 rounded-xl bg-card/40 border border-white/5 disabled:opacity-30 hover:bg-white/10 transition-all active:scale-95 backdrop-blur-md hover:border-primary/20"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
