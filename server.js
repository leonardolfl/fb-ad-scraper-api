const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'sk_1a2b3c4d5e6f7g8h3434G3'; // valor padrão local (opcional)

app.use(cors());

app.get('/get-ad-count', async (req, res) => {
  const url = req.query.url;
  const token = req.headers['x-api-key'];

  if (token !== API_KEY) {
    return res.status(403).send({ error: 'Unauthorized: Invalid API key' });
  }

  if (!url) return res.status(400).send({ error: 'URL is required' });

  console.log(`🟡 Iniciando scraping para: ${url}`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Cabeçalhos para simular um navegador real
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });

  try {
    await page.goto(url, { timeout: 40000 });
    console.log(`✅ Página carregada: ${url}`);

    await page.waitForLoadState('networkidle'); // espera tudo carregar
    await page.waitForSelector('div[role="heading"][aria-level="3"]', { timeout: 25000 });
    console.log('✅ Seletor encontrado! Extraindo texto...');

    const result = await page.$eval(
      'div[role="heading"][aria-level="3"]',
      el => el.textContent.trim()
    );

    await browser.close();
    console.log(`✅ Resultado extraído: ${result}`);

    res.send({ result });
  } catch (err) {
    console.log('❌ ERRO no scraping:', err.message);
    const html = await page.content();
    await browser.close();

    res.status(500).send({
      error: 'Failed to extract data',
      detail: err.message,
      htmlSnippet: html.slice(0, 1000)
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
