const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function assertPage(path, mustContain) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    // A home pública não pode mais redirecionar para o OAuth: esse redirect era
    // o defeito A1 do plano de usabilidade (visitante nunca via a landing).
    // Aceitá-lo aqui faria o smoke passar justamente quando o bug volta.
    throw new Error(`HTTP smoke failed for ${url}: status ${response.status}`);
  }
  const html = await response.text();
  if (!html.includes(mustContain)) {
    throw new Error(
      `HTTP smoke failed for ${url}: missing expected text "${mustContain}"`,
    );
  }
}

// A landing renderiza a tagline; antes o smoke vigiava "GearLife", que também
// aparecia no <title> e no cabeçalho do menu lateral — uma asserção que
// passaria mesmo sem o corpo da landing.
await assertPage('/', 'Pedale. A gente cuida da manutenção.');
await assertPage('/como-funciona', 'Como funciona o GearLife');
await assertPage('/faq', 'Perguntas frequentes');
await assertPage('/privacidade', 'Privacidade');
await assertPage('/contato', 'Contato');

console.log('HTTP smoke passed.');
