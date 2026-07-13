"use client";

import { useState, useEffect } from 'react';
import { Maximize2, Share2, Code, Check, Star } from 'lucide-react';
import { Game } from '../types';

export function GameInteractions({ game }: { game: Game }) {
    const [copied, setCopied] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        // Track recently played games in localStorage
        const recentlyPlayedRaw = localStorage.getItem('recently-played');
        let recentlyPlayedList: Game[] = recentlyPlayedRaw ? JSON.parse(recentlyPlayedRaw) : [];
        
        recentlyPlayedList = recentlyPlayedList.filter((g) => g.slug !== game.slug);
        recentlyPlayedList.unshift(game);
        if (recentlyPlayedList.length > 12) {
            recentlyPlayedList = recentlyPlayedList.slice(0, 12);
        }
        localStorage.setItem('recently-played', JSON.stringify(recentlyPlayedList));

        // Track play counts in localStorage
        const mostPlayedRaw = localStorage.getItem('most-played');
        const mostPlayedMap: Record<string, { game: Game; playCount: number }> = mostPlayedRaw ? JSON.parse(mostPlayedRaw) : {};
        
        if (mostPlayedMap[game.slug]) {
            mostPlayedMap[game.slug].playCount += 1;
        } else {
            mostPlayedMap[game.slug] = { game, playCount: 1 };
        }
        localStorage.setItem('most-played', JSON.stringify(mostPlayedMap));

        // Load favorite status
        const favoritesRaw = localStorage.getItem('favorites');
        const favoritesList: Game[] = favoritesRaw ? JSON.parse(favoritesRaw) : [];
        setIsFavorite(favoritesList.some((g) => g.slug === game.slug));
    }, [game]);

    const toggleFullscreen = () => {
        const iframe = document.querySelector('iframe');
        if (iframe) {
            type IframeWithFullscreen = HTMLIFrameElement & {
                webkitRequestFullscreen?: () => void;
                msRequestFullscreen?: () => void;
            };

            const target = iframe as IframeWithFullscreen;

            if (target.requestFullscreen) {
                target.requestFullscreen();
            } else if (target.webkitRequestFullscreen) { /* Safari */
                target.webkitRequestFullscreen();
            } else if (target.msRequestFullscreen) { /* IE11 */
                target.msRequestFullscreen();
            }
        }
    };

    const copyEmbed = () => {
        const embedCode = `<iframe src="https://sopkit.github.io/games/embed/${game.slug}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`;
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareGame = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: game.name,
                    text: `Play ${game.name} on SOP Games!`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    const toggleFavorite = () => {
        const favoritesRaw = localStorage.getItem('favorites');
        let favoritesList: Game[] = favoritesRaw ? JSON.parse(favoritesRaw) : [];
        
        if (isFavorite) {
            favoritesList = favoritesList.filter((g) => g.slug !== game.slug);
            setIsFavorite(false);
        } else {
            favoritesList.push(game);
            setIsFavorite(true);
        }
        localStorage.setItem('favorites', JSON.stringify(favoritesList));
    };

    return (
        <div className="space-y-4">
            <button
                onClick={toggleFullscreen}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
                <Maximize2 className="w-5 h-5" />
                Enter Fullscreen
            </button>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={shareGame}
                    className="py-3 px-4 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 border border-border"
                >
                    <Share2 className="w-5 h-5" />
                    Share
                </button>
                <button
                    onClick={copyEmbed}
                    className="py-3 px-4 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 border border-border"
                >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Code className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Embed'}
                </button>
            </div>
            <button
                onClick={toggleFavorite}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 border ${
                    isFavorite 
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20' 
                        : 'bg-secondary text-secondary-foreground border-border hover:opacity-90'
                }`}
            >
                <Star className={`w-5 h-5 ${isFavorite ? 'fill-yellow-500' : ''}`} />
                {isFavorite ? 'Favorited' : 'Add to Favorites'}
            </button>
        </div>
    );
}
