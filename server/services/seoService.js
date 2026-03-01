/**
 * SEO Service - Pings Google and WebSub hubs to notify about new content
 * Uses node-fetch for HTTP requests (Node 18 compatible)
 */
const nodeFetch = require('node-fetch');

const pingGoogle = async () => {
    try {
        const clientUrl = process.env.CLIENT_URL || 'https://www.digitaljagran.com';
        const sitemapUrl = `${clientUrl}/sitemap-news.xml`;

        console.log(`Pinging Google with sitemap: ${sitemapUrl}`);

        // 1. Ping Google Search Console
        const googlePingUrl = `http://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
        const googlePing = nodeFetch(googlePingUrl)
            .then(res => {
                if (res.ok) console.log('Google Search Console pinged successfully.');
                else console.error('Failed to ping Google Search Console:', res.statusText);
            })
            .catch(err => console.error('Error pinging Google:', err));

        // 2. Ping PubSubHubbub (WebSub)
        const hubPing = nodeFetch('http://pubsubhubbub.appspot.com/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                'hub.mode': 'publish',
                'hub.url': `${clientUrl}/news`,
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
};

module.exports = { pingGoogle };
