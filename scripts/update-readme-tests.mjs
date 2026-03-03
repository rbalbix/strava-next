import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const readmePath = path.join(rootDir, 'Readme.md');
const coverageSummaryPath = path.join(
  rootDir,
  'coverage',
  'coverage-summary.json',
);

if (!fs.existsSync(coverageSummaryPath)) {
  console.error(
    'Coverage summary not found. Run `yarn test:coverage` before generating the report.',
  );
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
const total = summary.total || {};

const formatPct = (value) =>
  typeof value === 'number' ? `${value.toFixed(2)}%` : 'N/A';

const now = new Date().toISOString();

const reportBlock = [
  '<!-- TEST_STATUS_START -->',
  '## Test Status',
  '',
  `Last update: ${now}`,
  '',
  '| Metric | Coverage |',
  '| --- | ---: |',
  `| Lines | ${formatPct(total.lines?.pct)} |`,
  `| Statements | ${formatPct(total.statements?.pct)} |`,
  `| Functions | ${formatPct(total.functions?.pct)} |`,
  `| Branches | ${formatPct(total.branches?.pct)} |`,
  '',
  'Run locally:',
  '- `yarn test:unit`',
  '- `yarn test:regression`',
  '- `yarn test:coverage`',
  '<!-- TEST_STATUS_END -->',
  '',
].join('\n');

const readmeContent = fs.readFileSync(readmePath, 'utf8');
const startMarker = '<!-- TEST_STATUS_START -->';
const endMarker = '<!-- TEST_STATUS_END -->';

if (readmeContent.includes(startMarker) && readmeContent.includes(endMarker)) {
  const updated = readmeContent.replace(
    new RegExp(`${startMarker}[\\s\\S]*?${endMarker}\\n?`, 'm'),
    reportBlock,
  );
  fs.writeFileSync(readmePath, updated, 'utf8');
} else {
  const separator = readmeContent.endsWith('\n') ? '' : '\n';
  const appended = `${readmeContent}${separator}\n${reportBlock}`;
  fs.writeFileSync(readmePath, appended, 'utf8');
}

console.log('README test status updated successfully.');
