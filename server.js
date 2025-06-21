const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Chave de API para PROTEGER o seu endpoint.
const YOUR_API_KEY = process.env.API_KEY || 'sk_1a2b3c4d5e6f7g8h3434G3';

// Chave de API para USAR o serviço do ScrapingBee.
const SCRAPINGBEE_API_KEY = 'JSA3U856N8OV8D6U0UQGV34CYYO5NV1NP8KWM5F6QCY7PYTOPG8WETZIL8V6KZ8WYZXKZOQQEKH906CP';

app.use(cors());

// Middleware de autenticação
app.use((req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    if (providedApiKey === YOUR_API_KEY) {
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
        console.log(`[SCRAPINGBEE] Enviando requisição para a API do ScrapingBee...`);
        
        // Monta a requisição para a API do ScrapingBee com timeout explícito
        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: urlToScrape,
                render_js: 'true',
                'wait_for': 'div[role="heading"][aria-level="3"]'
            },
            timeout: 55000 // Timeout de 55 segundos. Se o ScrapingBee demorar mais que isso, a chamada falhará.
        });
        
        console.log(`[SCRAPINGBEE] Resposta recebida. Processando...`);
        
        const $ = cheerio.load(response.data);
        const selector = 'div[role="heading"][aria-level="3"]';
        const resultText = $(selector).text().trim();

        if (resultText) {
            console.log(`[SUCCESS] Texto extraído: "${resultText}"`);
            res.status(200).send({ result: resultText });
        } else {
            console.error(`[EXTRACTION-FAIL] Seletor não encontrado no HTML.`);
            res.status(404).send({ error: 'Seletor não encontrado na página renderizada.' });
        }

    } catch (error) {
        // Bloco de erro aprimorado para diagnóstico
        if (axios.isCancel(error)) {
            console.error('[CRITICAL-ERROR] Timeout: A requisição para o ScrapingBee demorou mais de 55 segundos.');
            res.status(504).send({
                error: 'Gateway Timeout',
                details: 'O serviço de scraping (ScrapingBee) demorou muito para responder. A página do Facebook pode ser muito pesada para o plano atual.'
            });
        } else if (error.response) {
            console.error(`[CRITICAL-ERROR] ScrapingBee API retornou um erro ${error.response.status}:`, error.response.data);
            res.status(502).send({
                error: 'Bad Gateway: Falha no serviço de scraping.',
                details: error.response.data
            });
        } else {
            console.error('[CRITICAL-ERROR] Erro de comunicação desconhecido:', error.message);
            res.status(500).send({
                error: 'Internal Server Error',
                details: error.message
            });
        }
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy de Scraping (Diagnóstico Final) iniciado na porta ${PORT}.`);
});
