#!/usr/bin/env node
/**
 * Gera a tabela de códigos do Readme.md a partir de
 * src/services/equipment.ts — fonte única do catálogo (o mesmo dado que o
 * modal "Componentes" exibe). Evita a tabela manual ficar defasada (a
 * anterior tinha códigos errados e faltava ~20 componentes).
 *
 * Uso: node scripts/generate-readme-codes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(root, 'src', 'services', 'equipment.ts');
const readmePath = join(root, 'Readme.md');

const START = '<!-- CODES_TABLE_START -->';
const END = '<!-- CODES_TABLE_END -->';

const source = readFileSync(sourcePath, 'utf8');

// Bloco do catálogo: de "export const Equipments = {" até o "}" de fechamento.
const catalogMatch = source.match(/export const Equipments = \{([\s\S]*?)\n\};/);
if (!catalogMatch) {
  console.error('Não encontrei "export const Equipments" em equipment.ts');
  process.exit(1);
}

// Cada entrada: Key: { id: '...', caption: '...', show: '...' } — nos dois
// formatos do arquivo (linha única ou multilinha). Ordem dos campos fixa.
const entryRe =
  /(\w+):\s*\{\s*id:\s*'([^']+)',\s*caption:\s*'[^']*',\s*show:\s*'([^']+)',?\s*\}/g;
const entries = [];
for (const m of catalogMatch[1].matchAll(entryRe)) {
  entries.push({ key: m[1], id: m[2], show: m[3] });
}

if (entries.length === 0) {
  console.error('Nenhum componente extraído de equipment.ts');
  process.exit(1);
}

const rows = entries.map((e) => `| ${e.show} | \`${e.id}\` |`).join('\n');
const block = `${START}
## Lista de códigos dos componentes

> Tabela gerada a partir de \`src/services/equipment.ts\` (fonte única do
> catálogo) — para atualizar: \`node scripts/generate-readme-codes.mjs\`.
> No app, a mesma lista está no menu lateral → **Componentes**.

| Componente | Código |
| --- | --- |
${rows}
${END}`;

const readme = readFileSync(readmePath, 'utf8');
const sectionRe = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!sectionRe.test(readme)) {
  console.error(`Marcadores ${START} / ${END} não encontrados no Readme.md`);
  process.exit(1);
}

writeFileSync(readmePath, readme.replace(sectionRe, block));
console.log(`Readme.md atualizado: ${entries.length} componentes.`);
