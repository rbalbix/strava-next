#!/usr/bin/env node

/**
 * 🛠️ GearLife Local Development & Testing Harness CLI
 * 
 * Este script fornece uma ferramenta de linha de comando robusta para testar o GearLife
 * localmente sem a necessidade de expor o localhost via túneis HTTPS (ngrok) ou depender
 * de disparos reais da API do Strava. Ele interage com o Redis do projeto e simula requisições.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

// 1. Carregar variáveis do .env ou .env.local
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          // Remover aspas simples ou duplas se houver
          process.env[key.trim()] = value.replace(/^['"]|['"]$/g, '');
        }
      });
      break;
    }
  }
}

loadEnv();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;
const WEBHOOK_SUBSCRIPTION_ID = Number(process.env.WEBHOOK_SUBSCRIPTION_ID || '123456');

// Inicializar cliente do Redis
let redis;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.warn('⚠️ Alerta: Não foi possível conectar ao Upstash Redis localmente. Verifique suas credenciais.');
}

const REDIS_KEYS = {
  auth: (athleteId) => `strava:auth:${athleteId}`,
  activities: (athleteId) => `strava:activities:${athleteId}`,
  statistics: (athleteId) => `strava:statistics:${athleteId}`,
};

const commands = {
  help: () => {
    console.log(`
🚀 **GearLife Development Harness CLI** 🚴

Uso:
  node scripts/dev-harness.mjs <comando> [argumentos]

Comandos Disponíveis:
  
  **1. Autenticação**
    auth-simulate <athleteId>
      Simula e injeta um cadastro de autenticação OAuth diretamente no Redis para um determinado atleta.
      Isso habilita o webhook a aceitar eventos desse atleta sem passar pelo fluxo real do Strava.
  
  **2. Simulação de Webhooks**
    webhook-simulate <athleteId> <activityId> <create|update|delete> [activityName] [privateNote]
      Dispara um evento de webhook mockado simulando a API do Strava para a aplicação local.
      - Se aspectType for 'create' ou 'update', e activityName contiver '*', a rota local do Next.js
        irá processar a atividade e atualizar o cache do Redis.
  
  **3. Inspeção de Dados**
    redis-inspect <athleteId>
      Lê diretamente do Redis o estado atualizado do atleta (dados de login, atividades cacheadas e estatísticas).
  
  **4. Observabilidade**
    metrics-fetch
      Consome o endpoint de métricas (/api/metrics) usando a chave de API interna e exibe os contadores Prometheus em tempo real.
    `);
  },

  'auth-simulate': async (athleteIdStr) => {
    if (!redis) throw new Error('Cliente do Redis não configurado no .env');
    const athleteId = Number(athleteIdStr);
    if (!athleteId || isNaN(athleteId)) {
      console.error('❌ Por favor, informe um athleteId numérico válido.');
      return;
    }

    const mockAuth = {
      refreshToken: 'mock_refresh_token_123456',
      accessToken: 'mock_access_token_123456',
      expiresAt: Math.floor(Date.now() / 1000) + 3600 * 6, // Válido por 6 horas
      lastUpdated: Math.floor(Date.now() / 1000),
      athleteInfo: {
        id: athleteId,
        username: 'atleta_teste',
        firstname: 'Ciclista',
        lastname: 'Simulado',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brazil',
        sex: 'M',
        premium: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        badge_type_id: 0,
        weight: 75.5,
        profile_medium: 'https://images.peer.strava.com/placeholder.png',
        profile: 'https://images.peer.strava.com/placeholder.png',
        friend: null,
        follower: null,
      },
    };

    const key = REDIS_KEYS.auth(athleteId);
    await redis.setex(key, 90 * 24 * 3600, JSON.stringify(mockAuth));
    console.log(`✅ Auth simulação injetada no Redis sob a chave: ${key}`);
    console.log(JSON.stringify(mockAuth, null, 2));
  },

  'webhook-simulate': async (athleteIdStr, activityIdStr, aspectType, activityName = 'Pedal com troca de corrente *', privateNote = 'chain,lub') => {
    const athleteId = Number(athleteIdStr);
    const activityId = Number(activityIdStr);

    if (!athleteId || !activityId || !aspectType) {
      console.error('❌ Parâmetros inválidos. Uso: node scripts/dev-harness.mjs webhook-simulate <athleteId> <activityId> <create|update|delete> [activityName] [privateNote]');
      return;
    }

    const payload = {
      object_type: 'activity',
      object_id: activityId,
      aspect_type: aspectType,
      updates: aspectType === 'update' ? { title: activityName } : {},
      owner_id: athleteId,
      subscription_id: WEBHOOK_SUBSCRIPTION_ID,
      event_time: Math.floor(Date.now() / 1000),
    };

    console.log(`📡 Enviando webhook mockado para ${APP_URL}/api/webhook...`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${APP_URL}/api/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': `harness-${crypto.randomUUID().slice(0, 8)}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.log(`\nStatus HTTP de Resposta: ${response.status}`);
      try {
        const json = JSON.parse(text);
        console.log('Dados de Resposta:', JSON.stringify(json, null, 2));
      } catch (_) {
        console.log('Resposta Bruta:', text);
      }
    } catch (e) {
      console.error('❌ Falha ao conectar ao servidor local. Verifique se o app Next.js está rodando (npm run dev).', e.message);
    }
  },

  'redis-inspect': async (athleteIdStr) => {
    if (!redis) throw new Error('Cliente do Redis não configurado no .env');
    const athleteId = Number(athleteIdStr);
    if (!athleteId || isNaN(athleteId)) {
      console.error('❌ Por favor, informe um athleteId numérico válido.');
      return;
    }

    console.log(`🔍 Inspecionando dados no Redis para o Atleta #${athleteId}...\n`);

    const auth = await redis.get(REDIS_KEYS.auth(athleteId));
    const activities = await redis.get(REDIS_KEYS.activities(athleteId));
    const stats = await redis.get(REDIS_KEYS.statistics(athleteId));

    console.log('--- 🔑 AUTH DATA ---');
    console.log(auth ? JSON.stringify(auth, null, 2) : 'Nenhum dado de autenticação encontrado.');

    console.log('\n--- 🚴 ACTIVITES ---');
    console.log(activities ? `Encontradas ${activities.activities?.length || 0} atividades. Última atualização: ${new Date(activities.lastUpdated * 1000).toLocaleString()}` : 'Nenhuma atividade armazenada.');

    console.log('\n--- 📊 STATISTICS & GEAR ---');
    console.log(stats ? JSON.stringify(stats, null, 2) : 'Nenhuma estatística processada.');
  },

  'metrics-fetch': async () => {
    if (!INTERNAL_API_TOKEN) {
      console.error('❌ INTERNAL_API_TOKEN não está definido no .env do seu projeto.');
      return;
    }

    console.log(`📡 Buscando métricas do servidor em ${APP_URL}/api/metrics...`);
    try {
      const response = await fetch(`${APP_URL}/api/metrics`, {
        method: 'GET',
        headers: {
          'X-Internal-Api-Key': INTERNAL_API_TOKEN,
        },
      });

      const text = await response.text();
      console.log(`\nStatus HTTP de Resposta: ${response.status}`);
      if (response.ok) {
        console.log('--- 📈 PROMETHEUS METRICS ---');
        console.log(text);
      } else {
        console.error('Erro:', text);
      }
    } catch (e) {
      console.error('❌ Falha ao buscar métricas locais. O servidor local está online?', e.message);
    }
  },
};

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || !commands[cmd]) {
    commands.help();
    return;
  }

  try {
    await commands[cmd](...args);
  } catch (error) {
    console.error(`❌ Erro durante a execução do comando "${cmd}":`, error.message);
  }
}

main();
