const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Middleware de autenticação (sem alterações)
app.use((req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    if (!API_KEY || providedApiKey === API_KEY) {
        next();
    } else {
        console.log(`[AUTH-FAIL] Tentativa de acesso bloqueada. Chave fornecida: ${providedApiKey}`);
        res.status(401).send({ error: 'Unauthorized: Invalid or missing API Key.' });
    }
});

app.get('/get-ad-count', async (req, res) => {
    const urlToScrape = req.query.url;
    console.log(`[${new Date().toISOString()}] ==> Requisição recebida para URL: ${urlToScrape}`);

    if (!urlToScrape) {
        console.log(`[BAD-REQUEST] Requisição sem parâmetro 'url'.`);
        return res.status(400).send({ error: 'Bad Request: Missing "url" query parameter.' });
    }

    let browser = null;
    try {
        console.log(`[PLAYWRIGHT-START] Iniciando instância do browser...`);
        // Aumentando o timeout de inicialização do browser para dar mais tempo em ambientes com poucos recursos.
        browser = await chromium.launch({ headless: true, timeout: 90000 }); 
        console.log(`[PLAYWRIGHT-SUCCESS] Browser iniciado com sucesso.`);

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
        });
        const page = await context.newPage();
        console.log(`[PAGE-ACTION] Navegando para a URL...`);

        // Timeout da navegação aumentado para 60 segundos
        await page.goto(urlToScrape, { timeout: 60000, waitUntil: 'domcontentloaded' });
        console.log(`[PAGE-SUCCESS] Página carregada. Aguardando pelo seletor...`);

        const selector = 'div[role="heading"][aria-level="3"]';
        // Timeout do seletor aumentado para 30 segundos
        await page.waitForSelector(selector, { timeout: 30000 });
        console.log(`[SELECTOR-SUCCESS] Seletor encontrado.`);

        const resultText = await page.$eval(selector, el => el.textContent.trim());
        console.log(`[EXTRACTION-SUCCESS] Texto extraído: "${resultText}"`);
        
        res.status(200).send({ result: resultText });

    } catch (error) {
        console.error(`[CRITICAL-ERROR] Falha no processo de scraping:`, error);
        res.status(500).send({ error: 'Failed to extract data from the page.', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
            console.log(`[BROWSER-CLOSE] Instância do browser fechada.`);
        }
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor de Scraping seguro iniciado e ouvindo na porta ${PORT}`);
});
