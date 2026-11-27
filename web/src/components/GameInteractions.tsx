"use client";

import { useState, useEffect } from 'react';
import { Maximize2, Share2, Code, Check, Star } from 'lucide-react';
import { Game } from '../types';
import {
    getBrowserStorage,
    readGameList,
    recordGamePlay,
    toggleFavorite as updateFavorite,
} from '../lib/browser-storage';

export function GameInteractions({ game }: { game: Game }) {
    const [copied, setCopied] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        const storage = getBrowserStorage();
        if (!storage) return;

        // These helpers tolerate corrupt JSON and browser storage restrictions.
        recordGamePlay(storage, game);
        setIsFavorite(readGameList(storage, 'favorites').some((item) => item.slug === game.slug));
    }, [game]);

    const toggleFullscreen = () => {
        const iframe = document.querySelector('iframe');
        if (!iframe) return;

        type IframeWithFullscreen = HTMLIFrameElement & {
            webkitRequestFullscreen?: () => void;
            msRequestFullscreen?: () => void;
        };
        const target = iframe as IframeWithFullscreen;

        if (target.requestFullscreen) {
            void target.requestFullscreen().catch((error) => console.error('Fullscreen request failed:', error));
        } else if (target.webkitRequestFullscreen) {
            target.webkitRequestFullscreen();
        } else if (target.msRequestFullscreen) {
            target.msRequestFullscreen();
        }
    };

    const copyEmbed = async () => {
        const embedCode = `<iframe src="https://sopkit.github.io/games/embed/${game.slug}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`;
        try {
            await navigator.clipboard.writeText(embedCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Unable to copy embed code:', error);
        }
    };

    const shareGame = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: game.name,
                    text: `Play ${game.name} on SOP Games!`,
                    url: window.location.href,
                });
            } catch (error) {
                // Closing the native share sheet is not an application error.
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.error('Error sharing game:', error);
                }
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Unable to copy game link:', error);
        }
    };

    const toggleFavorite = () => {
        const storage = getBrowserStorage();
        if (!storage) return;
        setIsFavorite(updateFavorite(storage, game));
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
