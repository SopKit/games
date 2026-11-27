import { fetchJsonWithRetry, normalizeGameFeed, persistGameRecords } from "./scripts/game-feed";

const FEED_URL = "https://gamemonetize.com/feed.php?format=0";

async function main() {
  console.log(`Fetching licensed game feed from ${FEED_URL}...`);
  const payload = await fetchJsonWithRetry(FEED_URL);
  const { games, skipped } = normalizeGameFeed(payload);

  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} invalid feed record(s):`);
    for (const item of skipped.slice(0, 20)) {
      console.warn(`  [${item.index}] ${item.reason}`);
    }
    if (skipped.length > 20) console.warn(`  ...and ${skipped.length - 20} more.`);
  }

  if (games.length === 0) {
    throw new Error("The feed contained no valid games; existing data was left untouched.");
  }

  await persistGameRecords(games);
  console.log(`Saved ${games.length} validated games to ./games.`);
}

main().catch((error) => {
  console.error("Game feed refresh failed:", error);
  process.exitCode = 1;
});
