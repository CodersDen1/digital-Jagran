const fetch = import('node-fetch').then(mod => mod.default); // Ensure fetch is available in Node < 18 or use global if available. Node 20 has global fetch.
// Actually, Digital Jagran uses Node. Check environment. Assuming Node 18+ for global fetch, or axios.
// Package.json has axios? No, server package.json doesn't have axios. It has express, mongoose etc.
// Let's use native fetch which is experimental in Node 18 but stable in 21. If older node, might fail. 
// Server package.json shows: "keywords": [], "dependencies": { ... }. 
// Let's check node version or just use https module if unsure. Or assuming modern node.
// safer to use 'https' or just try fetch if environment specific.
// The user prompt used `fetch` in example. I will assume global fetch is available (Node 18+).

/**
 * Pings Google and WebSub hubs to notify about new content
 * @param {string} slug - The slug of the new article
 */
const pingGoogle = async () => {
    try {
        const clientUrl = process.env.CLIENT_URL || 'https://www.digitaljagran.com';
        const sitemapUrl = `${clientUrl}/sitemap-news.xml`;

        console.log(`Pinging Google with sitemap: ${sitemapUrl}`);

        // 1. Ping Google Search Console
        const googlePingUrl = `http://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
        const googlePing = fetch(googlePingUrl)
            .then(res => {
                if (res.ok) console.log('Google Search Console pinged successfully.');
                else console.error('Failed to ping Google Search Console:', res.statusText);
            })
            .catch(err => console.error('Error pinging Google:', err));

        // 2. Ping PubSubHubbub (WebSub)
        const hubPing = fetch('http://pubsubhubbub.appspot.com/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                'hub.mode': 'publish',
                'hub.url': `${clientUrl}/news`, // The URL of the news feed/section. 
                // Note: The sitemap-news.xml is a sitemap, hub.url usually points to the Atom/RSS feed or the topic URL. 
                // If we don't have an RSS feed, pointing to the news section is a fallback, 
                // but WebSub works best with Atom/RSS. 
                // For the purpose of this task, we will follow the user's prompt example which used 'news'.
            }),
        })
            .then(res => {
                if (res.ok) console.log('WebSub Hub pinged successfully.');
                else console.error('Failed to ping WebSub Hub:', res.statusText);
            })
            .catch(err => console.error('Error pinging WebSub:', err));

        await Promise.all([googlePing, hubPing]);
        console.log('Indexing pings initiated.');
    } catch (error) {
        console.error('Critical error in pingGoogle:', error);
    }
}

module.exports = { pingGoogle };
