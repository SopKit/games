import { write } from "bun";
import { mkdir, rm } from "node:fs/promises";

const FEED_URL = "https://gamemonetize.com/feed.php?format=0";
const OUTPUT_DIR = "games";

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start
        .replace(/-+$/, '');            // Trim - from end
}

async function fetchAndSaveGames() {
    console.log(`Cleaning and recreating directory: ${OUTPUT_DIR}`);
    try {
        await rm(OUTPUT_DIR, { recursive: true, force: true });
    } catch (e) {}
    await mkdir(OUTPUT_DIR, { recursive: true });

    console.log(`Fetching GameMonetize licensed feed from ${FEED_URL}...`);
    try {
        const response = await fetch(FEED_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const gamesList = await response.json();
        console.log(`Successfully fetched ${gamesList.length} games.`);

        let count = 0;
        for (const item of gamesList) {
            const gameId = item.id;
            const title = item.title;
            const slug = slugify(title);
            
            // Generate a deterministic rating between 4.0 and 5.0 based on ID
            const rating = (4.0 + (parseInt(gameId || "0") % 11) / 10).toFixed(1);

            const gameData = {
                id: gameId,
                name: title,
                slug: slug,
                description: item.description || `Play ${title} online for free.`,
                instructions: item.instructions || "Use keyboard/mouse to play.",
                category: item.category || "Casual",
                tags: item.tags ? item.tags.split(',').map((t: string) => t.trim()) : [],
                url: item.url,
                embedUrl: item.url, // GameMonetize URLs are directly embeddable HTML5 game pages
                image: item.thumb,
                width: item.width || "800",
                height: item.height || "600",
                rating: rating,
            };

            const outputPath = `${OUTPUT_DIR}/${gameId}.json`;
            await write(outputPath, JSON.stringify(gameData, null, 2));
            count++;
        }

        console.log(`Successfully saved ${count} licensed games to ${OUTPUT_DIR}.`);
    } catch (error) {
        console.error("Error fetching or saving games:", error);
    }
}

fetchAndSaveGames();
