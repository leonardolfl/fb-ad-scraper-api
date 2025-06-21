const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Chave de API para PROTEGER o seu endpoint no Railway.
const YOUR_API_KEY = process.env.API_KEY || 'sk_1a2b3c4d5e6f7g8h3434G3';

// Chave de API para USAR o serviço do ScrapingBee.
// NOTA TÉCNICA: O ideal é que esta chave também seja uma variável de ambiente, mas estamos usando-a diretamente conforme sua solicitação para agilizar.
const SCRAPINGBEE_API_KEY = 'JSA3U856N8OV8D6U0UQGV34CYYO5NV1NP8KWM5F6QCY7PYTOPG8WETZIL8V6KZ8WYZXKZOQQEKH906CP';

app.use(cors());

// Middleware de autenticação (sem alterações)
app.use((req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    if (providedApiKey === YOUR_API_KEY) {
        next();
    } else {
        console.log(`[AUTH-FAIL] Acesso bloqueado. Chave fornecida: ${providedApiKey}`);
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
        
        // Monta a requisição para a API do ScrapingBee
        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: urlToScrape,
                render_js: 'true', // Essencial: Pede ao ScrapingBee para renderizar o JavaScript da página.
                'wait_for': 'div[role="heading"][aria-level="3"]' // Otimização: Pede para esperar este seletor aparecer.
            }
        });
        
        console.log(`[SCRAPINGBEE] Resposta recebida. Status: ${response.status}. Processando HTML...`);
        
        // Carrega o HTML recebido no Cheerio (um "jQuery para servidor")
        const $ = cheerio.load(response.data);
        
        // Usa o mesmo seletor de antes para encontrar e extrair o texto
        const selector = 'div[role="heading"][aria-level="3"]';
        const resultText = $(selector).text().trim();

        if (resultText) {
            console.log(`[SUCCESS] Texto extraído: "${resultText}"`);
            res.status(200).send({ result: resultText });
        } else {
            console.error(`[EXTRACTION-FAIL] O seletor "${selector}" não foi encontrado no HTML retornado pelo ScrapingBee.`);
            res.status(404).send({ error: 'Seletor não encontrado na página renderizada.' });
        }

    } catch (error) {
        console.error('[CRITICAL-ERROR] Falha ao chamar a API do ScrapingBee:', error.response ? error.response.data : error.message);
        res.status(502).send({
            error: 'Bad Gateway: Falha ao obter dados do serviço de scraping.',
            details: error.response ? error.response.data : 'Erro de comunicação com a API externa.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy de Scraping Leve iniciado na porta ${PORT}. Aguardando requisições.`);
});
