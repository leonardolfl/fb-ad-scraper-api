const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Chave de API para PROTEGER o seu endpoint no Railway.
const YOUR_API_KEY = process.env.API_KEY;

// Chave de API para USAR o serviço do ScrapingBee.
const SCRAPINGBEE_API_KEY = 'JSA3U856N8OV8D6U0UQGV34CYYO5NV1NP8KWM5F6QCY7PYTOPG8WETZIL8V6KZ8WYZXKZOQQEKH906CP';

app.use(cors());

// Middleware de autenticação
app.use((req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    if (providedApiKey && providedApiKey === YOUR_API_KEY) {
        next();
    } else {
        res.status(401).send({ error: 'Unauthorized: Chave de API inválida ou ausente.' });
    }
});

app.get('/get-ad-count', async (req, res) => {
    const urlToScrape = req.query.url;
    console.log(`[REQUEST] Recebida solicitação para URL: ${urlToScrape}`);

    if (!urlToScrape) {
        return res.status(400).send({ error: 'Bad Request: O parâmetro "url" é obrigatório.' });
    }

    try {
        console.log(`[SCRAPINGBEE] Enviando requisição com PREMIUM PROXY...`);
        
        // Monta a requisição para a API do ScrapingBee com o parâmetro de proxy premium
        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: urlToScrape,
                render_js: 'true',
                premium_proxy: 'true', // <-- ESTA É A ALTERAÇÃO CRUCIAL
                'wait_for': 'div[role="heading"][aria-level="3"]'
            },
            timeout: 55000 
        });
        
        console.log(`[SCRAPINGBEE] Resposta recebida. Processando...`);
        
        const $ = cheerio.load(response.data);
        const selector = 'div[role="heading"][aria-level="3"]';
        const resultText = $(selector).text().trim();

        if (resultText && !resultText.toLowerCase().includes('ad blocker')) {
            console.log(`[SUCCESS] Texto extraído: "${resultText}"`);
            res.status(200).send({ result: resultText });
        } else {
            console.error(`[EXTRACTION-FAIL] O seletor retornou um texto inesperado: "${resultText}"`);
            res.status(404).send({ error: 'Seletor retornou texto de bloqueio ou não foi encontrado.' });
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
    console.log(`✅ Proxy de Scraping (Premium) iniciado na porta ${PORT}.`);
});
