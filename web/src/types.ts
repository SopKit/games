export interface Game {
    id: string;
    name: string;
    slug: string;
    url: string;
    embedUrl: string;
    image: string;
    rating?: string;
    ratingCount?: number;
    description?: string;
    instructions?: string;
    category?: string;
    tags?: string[];
    width?: string;
    height?: string;
}
