import fs from 'fs';
import path from 'path';
import { calcAPCA } from 'apca-w3';

const CSS_PATH = path.resolve('src/styles/globals.css');
const IS_MAIN = import.meta.url.endsWith(path.normalize(process.argv[1]));

// Configuração dos pares de tokens para validação
// Mapeamos o par: [texto, fundo, threshold_minimo]
const TOKEN_PAIRS = [
  ['--gl-text-primary', '--gl-surface-primary', 60],
  ['--gl-text-secondary', '--gl-surface-primary', 45],
  ['--gl-text-on-brand', '--gl-brand-primary', 60],
  ['--gl-status-normal', '--gl-surface-primary', 45],
  ['--gl-status-warning', '--gl-surface-primary', 45],
  ['--gl-status-overdue', '--gl-surface-primary', 45],
];

export function parseCSSVariables(content, isDarkMode = false) {
  const variables = {};
  
  let rootContent = '';
  if (isDarkMode) {
    const mediaIndex = content.indexOf('(prefers-color-scheme: dark)');
    if (mediaIndex !== -1) {
      const start = content.indexOf('{', mediaIndex);
      if (start !== -1) {
        let depth = 1;
        let end = start + 1;
        while (depth > 0 && end < content.length) {
          if (content[end] === '{') depth++;
          else if (content[end] === '}') depth--;
          end++;
        }
        const mediaContent = content.slice(start, end);
        const rootMatch = mediaContent.match(/:root\s*{([\s\S]*?)}/);
        if (rootMatch) rootContent = rootMatch[1];
      }
    }
  } else {
    // Regex para pegar o primeiro :root que não esteja dentro de uma media query
    // Simplificado: removemos os blocos @media primeiro para extrair o :root global
    const contentWithoutMedia = content.replace(/@media[\s\S]*?{[^{}]*({[^{}]*}[^{}]*)*}/g, '');
    const rootMatch = contentWithoutMedia.match(/:root\s*{([\s\S]*?)}/);
    if (rootMatch) rootContent = rootMatch[1];
    
    // Fallback: se o acima falhar, pegamos o primeiro :root do arquivo original
    if (!rootContent) {
      const fallbackMatch = content.match(/:root\s*{([\s\S]*?)}/);
      if (fallbackMatch) rootContent = fallbackMatch[1];
    }
  }

  const varRegex = /(--[a-z0-9-]+):\s*([^;]+);/gi;
  let match;
  while ((match = varRegex.exec(rootContent)) !== null) {
    variables[match[1]] = match[2].trim().replace(/\/\*[\s\S]*?\*\//g, '').trim();
  }
  
  return variables;
}

export function resolveColor(varName, themeVars, allVars) {
  let value = themeVars[varName] || allVars[varName];
  
  if (!value) return null;
  
  if (value.startsWith('var(')) {
    const refMatch = value.match(/var\((--[a-z0-9-]+)\)/);
    if (refMatch) {
      return resolveColor(refMatch[1], themeVars, allVars);
    }
  }
  
  return value;
}

export function colorToHex(color) {
  if (color.startsWith('#')) return color;
  if (color.startsWith('rgb')) {
    const parts = color.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return '#' + parts.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    }
  }
  const names = { 'white': '#ffffff', 'black': '#000000', 'whitesmoke': '#f5f5f5' };
  return names[color.toLowerCase()] || color;
}

async function validate() {
  const content = fs.readFileSync(CSS_PATH, 'utf8');
  
  const lightVars = parseCSSVariables(content, false);
  const darkVars = parseCSSVariables(content, true);
  
  let hasError = false;
  
  console.log('--- Validando Contraste de Cores (APCA) ---');
  
  for (const theme of ['Light', 'Dark']) {
    console.log(`\nTema: ${theme}`);
    const currentVars = theme === 'Light' ? lightVars : darkVars;
    
    for (const [textVar, bgVar, threshold] of TOKEN_PAIRS) {
      const textColorRaw = resolveColor(textVar, currentVars, lightVars);
      const bgColorRaw = resolveColor(bgVar, currentVars, lightVars);
      
      if (!textColorRaw || !bgColorRaw) {
        console.warn(`[?] ${textVar} ou ${bgVar} não encontrados.`);
        continue;
      }
      
      const textColor = colorToHex(textColorRaw);
      const bgColor = colorToHex(bgColorRaw);
      
      const contrastValue = calcAPCA(textColor, bgColor);
      const contrast = Math.abs(parseFloat(contrastValue));
      const passed = contrast >= threshold;
      
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} [${textVar} vs ${bgVar}]: Lc ${contrast.toFixed(1)} (Min: ${threshold})`);
      
      if (!passed) hasError = true;
    }
  }
  
  if (hasError) {
    console.error('\nErro: Algumas combinações de cores não atingiram o contraste mínimo de acessibilidade.');
    process.exit(1);
  } else {
    console.log('\nSucesso: Todas as combinações de cores são acessíveis.');
  }
}

if (IS_MAIN) {
  validate().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
