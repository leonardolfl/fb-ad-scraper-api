const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Carrega a SUA chave de API (Railway) de forma segura a partir das variáveis de ambiente.
const YOUR_API_KEY = process.env.API_KEY;

// Chave de API do serviço ScrapingBee.
const SCRAPINGBEE_API_KEY = 'JSA3U856N8OV8D6U0UQGV34CYYO5NV1NP8KWM5F6QCY7PYTOPG8WETZIL8V6KZ8WYZXKZOQQEKH906CP';

app.use(cors());

// Middleware de autenticação que valida a chave recebida com a do ambiente Railway.
app.use((req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    if (providedApiKey && providedApiKey === YOUR_API_KEY) {
        next();
    } else {
        // Esta mensagem de erro agora só deve aparecer se a variável no Railway for removida.
        console.log(`[AUTH-FAIL] Acesso negado. Chave recebida: '${providedApiKey}' vs Esperada: '${YOUR_API_KEY}'`);
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
        console.log(`[SCRAPINGBEE] Enviando requisição com PREMIUM PROXY e JS SCENARIO...`);
        
        // Cenário de JavaScript para simular um comportamento mais humano.
        const jsScenario = {
            "instructions": [
                { "wait": 2500 },      // 1. Espera 2.5 segundos para a página inicial carregar.
                { "scroll_y": 1000 },  // 2. Rola a página para baixo para ativar scripts de carregamento dinâmico.
                { "wait": 2000 }       // 3. Espera mais 2 segundos após rolar.
            ]
        };
        
        // A chamada final para a API do ScrapingBee, com todas as nossas táticas.
        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: SCRAPINGBEE_API_KEY,
                url: urlToScrape,
                render_js: 'true',
                premium_proxy: 'true',           // Tática 1: Usa um IP residencial.
                js_scenario: JSON.stringify(jsScenario), // Tática 2: Simula comportamento humano.
                'wait_for': 'div[role="heading"][aria-level="3"]' // Otimização: Espera pelo nosso seletor.
            },
            timeout: 55000 // Mantém um timeout generoso.
        });
        
        console.log(`[SCRAPINGBEE] Resposta recebida. Processando HTML...`);
        
        const $ = cheerio.load(response.data);
        const selector = 'div[role="heading"][aria-level="3"]';
        const resultText = $(selector).text().trim();

        // Verificação final para garantir que não pegamos o texto do bloqueador de anúncios.
        if (resultText && !resultText.toLowerCase().includes('ad blocker')) {
            console.log(`[SUCCESS] Texto extraído com sucesso: "${resultText}"`);
            res.status(200).send({ result: resultText });
        } else {
            console.error(`[EXTRACTION-FAIL] O seletor retornou um texto inesperado ou estava vazio. Texto: "${resultText}"`);
            res.status(404).send({ error: 'Seletor retornou texto de bloqueio ou não foi encontrado após o cenário JS.' });
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
    console.log(`✅ Proxy de Scraping (CENÁRIO JS) iniciado na porta ${PORT}.`);
});
