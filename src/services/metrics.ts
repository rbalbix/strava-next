/**
 * Simples sistema de métricas em memória (sem dependências externas).
 * Funciona tanto no cliente quanto no servidor com no-ops no cliente.
 * Expõe formato Prometheus-compatível via /api/metrics.
 */

interface Counter {
  inc: (labels?: Record<string, string> | number) => void;
  getName: () => string;
  getValue: (labels?: Record<string, string>) => number;
  getAll: () => Array<{ labels: Record<string, string>; value: number }>;
}

interface Registry {
  metrics: () => Promise<string>;
  contentType: string;
}

// In-memory metrics store
const metricsStore: Map<
  string,
  Array<{ labels: Record<string, string>; value: number }>
> = new Map();

/**
 * Create a counter that tracks increments with optional labels.
 */
function createCounter(
  name: string,
  help: string,
  labelNames: string[] = [],
): Counter {
  if (!metricsStore.has(name)) {
    metricsStore.set(name, []);
  }

  return {
    inc: (labels?: Record<string, string> | number) => {
      if (typeof window !== 'undefined') return; // no-op on client

      const labelObj =
        typeof labels === 'object' && labels !== null ? labels : {};

      const store = metricsStore.get(name) || [];
      const existing = store.find(
        (entry) => JSON.stringify(entry.labels) === JSON.stringify(labelObj),
      );

      if (existing) {
        existing.value++;
      } else {
        store.push({ labels: labelObj, value: 1 });
      }

      metricsStore.set(name, store);
    },

    getName: () => name,

    getValue: (labels?: Record<string, string>) => {
      const store = metricsStore.get(name) || [];
      const labelObj = labels || {};
      const entry = store.find(
        (e) => JSON.stringify(e.labels) === JSON.stringify(labelObj),
      );
      return entry?.value || 0;
    },

    getAll: () => metricsStore.get(name) || [],
  };
}

/**
 * Create a Prometheus-compatible registry that exports metrics.
 */
function createRegistry(): Registry {
  return {
    metrics: async () => {
      if (typeof window !== 'undefined') return ''; // no-op on client

      let output = '';

      // Iterate over all registered metrics
      metricsStore.forEach((entries, metricName) => {
        output += `# HELP ${metricName} Custom metric\n`;
        output += `# TYPE ${metricName} counter\n`;

        entries.forEach(({ labels, value }) => {
          let labelString = '';
          if (Object.keys(labels).length > 0) {
            const labelPairs = Object.entries(labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',');
            labelString = `{${labelPairs}}`;
          }
          output += `${metricName}${labelString} ${value}\n`;
        });
      });

      return output;
    },
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
  };
}

// Create registry and counters
const register = createRegistry();

export const webhookEvents = createCounter(
  'webhook_events_total',
  'Total number of webhook events received',
  ['object_type', 'aspect_type'],
);

export const webhookValidationFailed = createCounter(
  'webhook_validation_failed_total',
  'Total number of webhook payload validation failures',
);

export const emailSent = createCounter(
  'email_sent_total',
  'Total number of emails sent',
);

export const emailFailed = createCounter(
  'email_failed_total',
  'Total number of failed email sends',
);

export const tokenRefreshAttempts = createCounter(
  'token_refresh_attempts_total',
  'Total number of strava token refresh attempts',
);

export const tokenRefreshSuccess = createCounter(
  'token_refresh_success_total',
  'Total number of successful token refreshes',
);

export const tokenRefreshFailure = createCounter(
  'token_refresh_failure_total',
  'Total number of failed token refreshes',
);

export const activityProcessed = createCounter(
  'activity_processed_total',
  'Total number of activities successfully processed',
);

export const activityFailed = createCounter(
  'activity_failed_total',
  'Total number of activity processing failures',
);

export { register };

export default register;
