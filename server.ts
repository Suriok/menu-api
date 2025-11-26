import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import db from './src/config/db';
import { analyzeMenuWithAI } from './src/services/llm';
import { fetchPageContent } from './src/services/scraper';
import { MenuRequest, MenuResponse, CacheRow } from './src/types/types';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/summarize', async (req: Request<{}, {}, MenuRequest>, res: Response) => {
    try {
        const { url, date } = req.body;
        const forceRefresh = req.query.refresh === 'true';

        if (!url || !date) {
            return res.status(400).json({ error: 'Missing url or date' });
        }

        console.log(`\n Request: ${url} [${date}]`);

        db.prepare('DELETE FROM cache WHERE expires_at < ?').run(Date.now());

        const cacheKey = `${url}|${date}`;
        if (!forceRefresh) {
            const cachedRow = db.prepare('SELECT data FROM cache WHERE key = ?').get(cacheKey) as CacheRow | undefined;
            if (cachedRow) {
                console.log('Cache HIT');
                const parsedData = JSON.parse(cachedRow.data) as MenuResponse;
                return res.json({ ...parsedData, source: 'cache' });
            }
        }

        console.log('Downloading...');
        let pageText = "";
        try {
            pageText = await fetchPageContent(url);
        } catch (err: any) {
            console.error(`Download error: ${err.message || err.status}`);
            const status = err.status || 500;
            const message = status === 504 ? "Časový limit vypršel" : "Stránka není dostupná";
            return res.status(status).json({ error: message });
        }

        console.log('AI Analysis...');
        const menuData = await analyzeMenuWithAI(pageText, date);
        const finalResult: MenuResponse = { ...menuData, source_url: url };

        const ttl = (finalResult.is_closed || finalResult.menu_items.length === 0)
            ? 30 * 60 * 1000  // 30 min (Short TTL)
            : 24 * 60 * 60 * 1000; // 24 hours (Long TTL)

        db.prepare('INSERT OR REPLACE INTO cache (key, data, created_at, expires_at) VALUES (?, ?, ?, ?)')
            .run(cacheKey, JSON.stringify(finalResult), Date.now(), Date.now() + ttl);

        console.log('Success!');
        // @ts-ignore
        res.json({ ...finalResult, source: 'network' });

    } catch (error: any) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}