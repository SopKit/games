import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const viewport = {
	themeColor: "#0a0a0a",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
};

const BASE_URL = 'https://sopgames.30tools.com';

export const metadata: Metadata = {
	metadataBase: new URL('https://sopgames.30tools.com'),
	icons: {
		icon: '/favicon.svg',
	},
	title: {
		default: "SOP Games | Top Free Online Games",
		template: "%s | SOP Games"
	},
	description: "Play thousands of free online games instantly. Cinematic experience, no downloads. Action, Puzzle, Racing, and more.",
	keywords: ["free online games", "browser games", "html5 games", "no download games", "play online", "arcade", "casual"],
	authors: [{ name: "SOP Games" }],
	creator: "SOP Games",
	publisher: "SOP Games",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	openGraph: {
		title: "SOP Games | Top Free Online Games",
		description: "Play thousands of free online games instantly. Cinematic experience, no downloads.",
		url: 'https://sopgames.30tools.com',
		siteName: "SOP Games",
		images: [
			{
				url: 'https://sopgames.30tools.com/og-image.jpg', // Placeholder, user might need to add this
				width: 1200,
				height: 630,
				alt: 'SOP Games Preview',
			},
		],
		locale: 'en_US',
		type: "website",
	},
	twitter: {
		card: 'summary_large_image',
		title: "SOP Games | Top Free Online Games",
		description: "Play thousands of free online games instantly. Cinematic experience, no downloads.",
		creator: "@sopgames", // Placeholder
		site: "@sopgames", // Placeholder
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "SOP Games",
		startupImage: [
			'/apple-touch-icon.png', // Ideally these exist or we fallback
		],
	},
	formatDetection: {
		telephone: false,
	},
	category: 'technology',
	referrer: 'origin-when-cross-origin',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
		</html>
	);
}
