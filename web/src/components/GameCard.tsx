import Link from 'next/link';
import Image from 'next/image';
import { Game } from '../types';
import { Star, Play } from 'lucide-react';

export function GameCard({ game }: { game: Game }) {
    // Parsing rating to 1 decimal place
    const rating = parseFloat(game.rating).toFixed(1);

    return (
        <Link 
            href={`/game/${game.slug}`} 
            className="group relative block overflow-hidden rounded-2xl bg-card/45 border border-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20"
        >
            <div className="aspect-[4/3] w-full relative overflow-hidden bg-muted/20">
                <Image
                    src={game.image}
                    alt={game.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110 group-hover:blur-[0.5px]"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                />
                {/* Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity duration-300" />

                {/* Floating Rating Badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-yellow-400 text-[10px] font-bold tracking-wider">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{rating}</span>
                </div>

                {/* Central Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="p-4 rounded-full bg-primary/95 text-white shadow-lg shadow-primary/45 transform scale-75 group-hover:scale-100 transition-all duration-300 flex items-center justify-center border border-white/20">
                        <Play className="w-5 h-5 fill-current translate-x-[1px]" />
                    </div>
                </div>
            </div>

            <div className="p-3.5 relative">
                <h3 className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors tracking-wide">
                    {game.name}
                </h3>
                <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] font-black uppercase text-accent tracking-widest glow-text-accent">
                        Free Play
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        HTML5
                    </span>
                </div>
            </div>
        </Link>
    );
}
