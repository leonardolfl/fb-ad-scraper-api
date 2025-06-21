const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'sk_1a2b3c4d5e6f7g8h3434G3'; // Pode definir no Railway como variável de ambiente

app.use(cors());

app.get('/get-ad-count', async (req, res) => {
    const url = req.query.url;
    const token = req.headers['x-api-key'];

    if (token !== API_KEY) {
        return res.status(403).send({ error: 'Unauthorized: Invalid API key' });
    }

    if (!url) return res.status(400).send({ error: 'URL is required' });

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    try {
        await page.goto(url, { timeout: 30000 });
        await page.waitForSelector('div[role="heading"][aria-level="3"]', { timeout: 20000 });

        const result = await page.$eval('div[role="heading"][aria-level="3"]', el => el.textContent.trim());
        await browser.close();

        res.send({ result });
    } catch (err) {
        await browser.close();
        res.status(500).send({ error: 'Failed to extract data', detail: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
