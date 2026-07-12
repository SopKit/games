import Link from 'next/link';

export function Footer() {
    return (
        <footer className="w-full border-t border-white/5 bg-[#030014]/80 backdrop-blur-md pt-12 pb-8">
            <div className="container mx-auto max-w-7xl px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Column 1: Info */}
                <div className="md:col-span-2 space-y-4">
                    <span className="font-black text-xl tracking-wider text-white uppercase">
                        SOP Games
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                        Play thousands of premium online HTML5 browser games instantly with zero downloads. Experience seamless gameplay optimized for PC, tablet, and mobile devices.
                    </p>
                </div>

                {/* Column 2: Navigation */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-accent uppercase glow-text-accent">
                        Explore
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>
                            <Link href="/" className="hover:text-white transition-colors duration-300">
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link href="/#catalog" className="hover:text-white transition-colors duration-300">
                                Browse Games
                            </Link>
                        </li>
                        <li>
                            <Link href="/game/Shop-Mine-Deep" className="hover:text-white transition-colors duration-300">
                                Featured Title
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Column 3: Legal & GitHub */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-accent uppercase glow-text-accent">
                        Connect
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>
                            <a 
                                href="https://github.com/SopKit/games" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:text-white transition-colors duration-300"
                            >
                                GitHub Project
                            </a>
                        </li>
                        <li>
                            <a 
                                href="https://github.com/SopKit" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:text-white transition-colors duration-300"
                            >
                                SopKit Org
                            </a>
                        </li>
                        <li>
                            <Link href="/sitemap.xml" className="hover:text-white transition-colors duration-300">
                                Sitemap
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="container mx-auto max-w-7xl px-4 md:px-8 mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} SOP Games. All rights reserved.</p>
                <p className="flex items-center gap-1.5">
                    Powered by 
                    <a 
                        href="https://github.com/SopKit" 
                        className="text-white hover:underline hover:text-primary transition-all font-semibold"
                    >
                        SopKit
                    </a>
                </p>
            </div>
        </footer>
    );
}
