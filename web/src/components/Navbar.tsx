"use client";

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/30 backdrop-blur-xl transition-all duration-300">
            <div className="container mx-auto max-w-7xl h-16 px-4 md:px-8 flex items-center justify-between">
                {/* Logo & Branding */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/10 group-hover:scale-105 group-hover:shadow-primary/20 transition-all duration-300">
                        <Gamepad2 className="w-5 h-5 fill-current" />
                    </div>
                    <span className="font-black text-lg md:text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-primary/80 uppercase">
                        SOP Games
                    </span>
                </Link>

                {/* Nav Links */}
                <nav className="flex items-center gap-6 md:gap-8">
                    <Link 
                        href="/" 
                        className="text-xs md:text-sm font-bold tracking-widest uppercase text-muted-foreground hover:text-white transition-colors duration-300"
                    >
                        Home
                    </Link>
                    <Link 
                        href="/#catalog" 
                        className="text-xs md:text-sm font-bold tracking-widest uppercase text-muted-foreground hover:text-white transition-colors duration-300"
                    >
                        Browse
                    </Link>
                    <Link 
                        href="/game/Shop-Mine-Deep" 
                        className="text-xs md:text-sm font-bold tracking-widest uppercase text-accent hover:text-white transition-colors duration-300 glow-text-accent"
                    >
                        Featured
                    </Link>
                </nav>
            </div>
        </header>
    );
}
