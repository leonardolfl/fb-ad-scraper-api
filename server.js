const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Carrega a SUA chave de API (Railway) de forma segura a partir das variáveis de ambiente.
const YOUR_API_KEY = sk_1a2b3c4d5e6f7g8h3434G3;

// Chave de API do serviço ScrapingBee.
const SCRAPINGBEE_API_KEY = 'JSA3U856N8OV8D6U0UQGV34CYYO5NV1NP8KWM5F6QCY7PYTOPG8WETZIL8V6KZ8WYZXKZOQQEKH906CP';

app.use(cors());

// Middleware de autenticação com logs de diagnóstico para resolver o erro 401.
app.use((req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    
    // --- LINHAS DE DIAGNÓSTICO ---
    console.log(`[DIAGNÓSTICO] Chave de API recebida no header: '${providedApiKey}'`);
    console.log(`[DIAGNÓSTICO] Chave de API esperada do ambiente Railway: '${YOUR_API_KEY}'`);
    // ----------------------------

    if (providedApiKey && providedApiKey === YOUR_API_KEY) {
        console.log('[AUTH-SUCCESS] As chaves de API correspondem. Acesso permitido.');
        next();
    } else {
        console.log('[AUTH-FAIL] As chaves de API NÃO correspondem. Acesso negado.');
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
        
        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: urlToScrape,
                render_js: 'true',
                premium_proxy: 'true',
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
    console.log(`✅ Proxy de Scraping (Diagnóstico Final) iniciado na porta ${PORT}.`);
});
