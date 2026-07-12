import { promises as fs } from 'fs';
import path from 'path';

const KEY = '634a2c77198a45429967eb9dc1252278';
const KEY_LOCATION = 'https://sopkit.github.io/634a2c77198a45429967eb9dc1252278.txt';
const HOST = 'sopkit.github.io';
const BASE_URL = 'https://sopkit.github.io/games';

async function submitIndexNow() {
    try {
        console.log('Reading games.json...');
        const filePath = path.join(process.cwd(), 'web', 'public', 'games.json');
        const fileContents = await fs.readFile(filePath, 'utf8');
        const games = JSON.parse(fileContents);
        
        console.log(`Found ${games.length} games.`);
        
        // Generate list of URLs
        const urls = [
            BASE_URL,
            ...games.map((game: any) => `${BASE_URL}/game/${game.slug}`)
        ];
        
        console.log(`Total URLs to submit: ${urls.length}`);
        
        // IndexNow limits to 10,000 URLs per request
        const batchSize = 10000;
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            console.log(`Submitting batch ${Math.floor(i / batchSize) + 1} (${batch.length} URLs)...`);
            
            const payload = {
                host: HOST,
                key: KEY,
                keyLocation: KEY_LOCATION,
                urlList: batch
            };
            
            const response = await fetch('https://api.indexnow.org/indexnow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                console.log(`Batch ${Math.floor(i / batchSize) + 1} submitted successfully (Status: ${response.status})`);
            } else {
                const text = await response.text();
                console.error(`Failed to submit batch ${Math.floor(i / batchSize) + 1}. Status: ${response.status}, Response: ${text}`);
            }
        }
        
        console.log('IndexNow submission complete.');
    } catch (error) {
        console.error('Error submitting to IndexNow:', error);
        process.exit(1);
    }
}

submitIndexNow();
