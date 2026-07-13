export interface Game {
    id: string;
    name: string;
    slug: string;
    url: string;
    embedUrl: string;
    image: string;
    rating: string;
    description?: string;
    instructions?: string;
    category?: string;
    tags?: string[];
    width?: string;
    height?: string;
}
