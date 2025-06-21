app.get('/get-ad-count', async (req, res) => {
  const url = req.query.url;
  const token = req.headers['x-api-key'];

  if (token !== process.env.API_KEY) {
    return res.status(403).send({ error: 'Unauthorized: Invalid API key' });
  }

  if (!url) return res.status(400).send({ error: 'URL is required' });

  console.log(`🟡 Iniciando scraping para: ${url}`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(url, { timeout: 40000 });
    console.log(`✅ Página carregada: ${url}`);

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
    const html = await page.content(); // salva o HTML da página para entender o erro
    await browser.close();

    res.status(500).send({
      error: 'Failed to extract data',
      detail: err.message,
      htmlSnippet: html.slice(0, 1000) // mostra só o início
    });
  }
});
