import { promises as fs } from 'fs';
import path from 'path';

// Load keys from environment variables with fallbacks
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '8a92b225c56c4293a55543c3938a1234';
const BING_API_KEY = process.env.BING_API_KEY || '9b967fb442cc491d9abeb836052845bb';

const KEY_LOCATION = `https://sopkit.github.io/games/${INDEXNOW_KEY}.txt`;
const HOST = 'sopkit.github.io';
const BASE_URL = 'https://sopkit.github.io/games';

async function submitUrls() {
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
        
        // ==========================================
        // 1. Submit to IndexNow API (all URLs)
        // ==========================================
        console.log('\n--- Starting IndexNow Submission ---');
        const indexNowBatchSize = 10000;
        for (let i = 0; i < urls.length; i += indexNowBatchSize) {
            const batch = urls.slice(i, i + indexNowBatchSize);
            console.log(`Submitting IndexNow batch ${Math.floor(i / indexNowBatchSize) + 1} (${batch.length} URLs)...`);
            
            const payload = {
                host: HOST,
                key: INDEXNOW_KEY,
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
                console.log(`IndexNow batch ${Math.floor(i / indexNowBatchSize) + 1} submitted successfully (Status: ${response.status})`);
            } else {
                const text = await response.text();
                console.error(`Failed to submit IndexNow batch. Status: ${response.status}, Response: ${text}`);
            }
        }
        
        // ==========================================
        // 2. Submit to Bing Webmaster URL Submission API (limit to 9500 to stay under daily quota)
        // ==========================================
        if (BING_API_KEY) {
            console.log('\n--- Starting Bing Webmaster API Submission ---');
            // Bing API limits to 500 URLs per batch and 10,000 daily quota
            const bingBatchSize = 500;
            const maxBingUrls = 9500; // Stay safely under quota
            const bingUrls = urls.slice(0, maxBingUrls);
            
            console.log(`Preparing to submit ${bingUrls.length} URLs to Bing in batches of ${bingBatchSize}...`);
            
            for (let i = 0; i < bingUrls.length; i += bingBatchSize) {
                const batch = bingUrls.slice(i, i + bingBatchSize);
                console.log(`Submitting Bing batch ${Math.floor(i / bingBatchSize) + 1} (${batch.length} URLs)...`);
                
                const payload = {
                    siteUrl: BASE_URL,
                    urlList: batch
                };
                
                const response = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${BING_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) {
                    console.log(`Bing batch ${Math.floor(i / bingBatchSize) + 1} submitted successfully (Status: ${response.status})`);
                } else {
                    const text = await response.text();
                    console.error(`Failed to submit Bing batch. Status: ${response.status}, Response: ${text}`);
                }
                
                // Add a tiny delay between requests to avoid rate limits
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        } else {
            console.log('\nSkipping Bing Webmaster API submission (no API key provided).');
        }
        
        console.log('\nURL submissions complete.');
    } catch (error) {
        console.error('Error submitting URLs:', error);
        process.exit(1);
    }
}

submitUrls();
