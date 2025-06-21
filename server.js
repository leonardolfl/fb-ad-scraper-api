const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================= SOLUÇÃO DEFINITIVA =======================
// A SUA chave de API foi colocada diretamente aqui, conforme sua diretiva.
// Isso elimina qualquer problema com as variáveis de ambiente do Railway.
const YOUR_API_KEY = 'sk_1a2b3c4d5e6f7g8h3434G3';
// =================================================================

// Chave de API do serviço ScrapingBee.
const SCRAPINGBEE_API_KEY = 'JSA3U856N8OV8D6U0UQGV34CYYO5NV1NP8KWM5F6QCY7PYTOPG8WETZIL8V6KZ8WYZXKZOQQEKH906CP';

app.use(cors());

// Middleware de autenticação
app.use((req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    
    if (providedApiKey && providedApiKey === YOUR_API_KEY) {
        console.log('[AUTH-SUCCESS] Chave de API recebida e validada com sucesso.');
        next();
    } else {
        console.log(`[AUTH-FAIL] Acesso negado. Chave recebida: '${providedApiKey}'`);
        res.status(401).send({ error: 'Unauthorized: Chave de API inválida ou ausente.' });
    }
});

// Rota principal de scraping
app.get('/get-ad-count', async (req, res) => {
    const urlToScrape = req.query.url;
    console.log(`[REQUEST] Recebida solicitação para URL: ${urlToScrape}`);

    if (!urlToScrape) {
        return res.status(400).send({ error: 'Bad Request: O parâmetro "url" é obrigatório.' });
    }

    try {
        console.log(`[SCRAPINGBEE] Enviando requisição com TÁTICA AVANÇADA (Clique + Scroll)...`);
        
        const jsScenario = {
            "instructions": [
                { "wait_for": "div[aria-label='Rejeitar opcionais']" }, 
                { "click": "div[aria-label='Permitir todos os cookies']" }, 
                { "wait": 2500 }, 
                { "scroll_y": 1000 }, 
                { "wait": 2000 }
            ]
        };
        
        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: urlToScrape,
                render_js: 'true',
                premium_proxy: 'true',
                js_scenario: JSON.stringify(jsScenario),
                'wait_for': 'div[role="heading"][aria-level="3"]'
            },
            timeout: 55000 
        });
        
        console.log(`[SCRAPINGBEE] Resposta recebida. Processando...`);
        
        const $ = cheerio.load(response.data);
        const selector = 'div[role="heading"][aria-level="3"]';
        const rawText = $(selector).text().trim();
        console.log(`[DEBUG] Texto bruto extraído: "${rawText}"`);

        // ======================= LÓGICA DE LIMPEZA FINAL =======================
        // Usa uma expressão regular para encontrar o padrão de resultados desejado.
        const match = rawText.match(/(>?[0-9,.]+\+?\s*results?)/i);
        const resultText = match ? match[0] : null; // Pega a primeira correspondência exata.
        // =======================================================================

        if (resultText) {
            console.log(`[SUCCESS] Texto extraído e limpo: "${resultText}"`);
            res.status(200).send({ result: resultText });
        } else {
            console.error(`[EXTRACTION-FAIL] Padrão de resultados não encontrado no texto bruto: "${rawText}"`);
            res.status(404).send({ error: 'Padrão de resultados não encontrado no seletor.' });
        }

    } catch (error) {
        console.error('[CRITICAL-ERROR] Falha na chamada para a API do ScrapingBee:', error.message);
        res.status(502).send({
            error: 'Bad Gateway: Falha ao obter dados do serviço de scraping.',
            details: error.response ? error.response.data : error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy de Scraping (LIMPEZA FINAL) iniciado na porta ${PORT}.`);
});
