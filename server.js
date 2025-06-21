const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Chave de API fixada no código, conforme sua diretiva.
const YOUR_API_KEY = 'sk_1a2b3c4d5e6f7g8h3434G3';
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

// Rota principal de scraping
app.get('/get-ad-count', async (req, res) => {
    const urlToScrape = req.query.url;
    console.log(`[REQUEST] Recebida solicitação para URL: ${urlToScrape}`);

    if (!urlToScrape) {
        return res.status(400).send({ error: 'Bad Request: O parâmetro "url" é obrigatório.' });
    }

    try {
        console.log(`[SCRAPINGBEE] Enviando requisição com TÁTICA FINAL (Simplificada)...`);
        
        // ======================= ÚLTIMA TENTATIVA =======================
        // Removemos o 'wait_for' para simplificar a tarefa para o ScrapingBee.
        // Apenas pedimos para ele executar ações e nos devolver o resultado.
        const jsScenario = {
            "instructions": [
                { "wait_for": "div[aria-label='Rejeitar opcionais']" },
                { "click": "div[aria-label='Permitir todos os cookies']" },
                { "wait": 5000 } // Aumentamos a espera final para dar tempo de tudo carregar.
            ]
        };
        
        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: urlToScrape,
                render_js: 'true',
                premium_proxy: 'true',
                js_scenario: JSON.stringify(jsScenario)
            },
            timeout: 58000 // Timeout máximo, próximo do limite do Railway.
        });
        
        console.log(`[SCRAPINGBEE] Resposta recebida. Processando...`);
        
        const $ = cheerio.load(response.data);
        const selector = 'div[role="heading"][aria-level="3"]';
        const rawText = $(selector).text().trim();
        console.log(`[DEBUG] Texto bruto extraído: "${rawText}"`);

        const match = rawText.match(/(>?[0-9,.]+\+?\s*results?)/i);
        const resultText = match ? match[0] : null;

        if (resultText) {
            console.log(`[SUCCESS] Texto extraído e limpo: "${resultText}"`);
            res.status(200).send({ result: resultText });
        } else {
            console.error(`[EXTRACTION-FAIL] Padrão de resultados não encontrado no texto bruto: "${rawText}"`);
            res.status(404).send({ error: 'Padrão de resultados não encontrado no seletor.' });
        }

    } catch (error) {
        let errorMessage = 'Falha desconhecida na chamada para a API do ScrapingBee.';
        let statusCode = 502;

        if (error.code === 'ECONNABORTED' || (error.response && error.response.status === 504)) {
            errorMessage = 'O serviço de scraping (ScrapingBee) demorou muito para responder (timeout). O alvo é muito pesado.';
            statusCode = 504;
        } else if (error.response) {
            errorMessage = error.response.data;
        } else {
            errorMessage = error.message;
        }
        
        console.error(`[CRITICAL-ERROR] ${errorMessage}`);
        res.status(statusCode).send({
            error: 'Bad Gateway: Falha ao obter dados do serviço de scraping.',
            details: errorMessage
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy de Scraping (TÁTICA FINAL) iniciado na porta ${PORT}.`);
});
