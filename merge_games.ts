import { write } from "bun";
import { readdir, readFile } from "node:fs/promises";
import { join } from "path";

const GAMES_DIR = "games";
const OUTPUT_FILE = "games.json";

async function mergeGames() {
    console.log(`Reading files from ${GAMES_DIR}...`);
    try {
        const files = await readdir(GAMES_DIR);
        const jsonFiles = files.filter(file => file.endsWith(".json"));

        console.log(`Found ${jsonFiles.length} JSON files.`);

        const games = [];
        for (const file of jsonFiles) {
            const content = await readFile(join(GAMES_DIR, file), "utf-8");
            try {
                const game = JSON.parse(content);
                games.push(game);
            } catch (e) {
                console.error(`Failed to parse ${file}:`, e);
            }
        }

        console.log(`Merged ${games.length} games.`);
        console.log(`Writing to ${OUTPUT_FILE} and web/public/${OUTPUT_FILE}...`);

        const jsonString = JSON.stringify(games, null, 2);
        await write(OUTPUT_FILE, jsonString);
        await write(join("web", "public", OUTPUT_FILE), jsonString);

        console.log("Done!");

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

mergeGames();
