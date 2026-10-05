/* @vitest-environment jsdom */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import HowItWorksContent from '../../../src/components/HowItWorksContent';

function renderIntoContainer(element: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, root };
}

/** Trecho da seção de limites da página de ajuda (do título até o Passo 4). */
function helpLimitsSection(container: HTMLElement): string {
  const text = container.textContent ?? '';
  const start = text.indexOf('Limites');
  const end = text.indexOf('Passo 4');
  return start >= 0 && end > start ? text.slice(start, end) : '';
}

/** Trecho da seção de limites do Readme (do título até a seção de PWA). */
function readmeLimitsSection(): string {
  const readme = fs.readFileSync(path.join(process.cwd(), 'Readme.md'), 'utf8');
  const start = readme.indexOf('## 🔔 Limites');
  const end = readme.indexOf('## 📱 PWA');
  return start >= 0 && end > start ? readme.slice(start, end) : '';
}

describe('textos de descoberta da unidade', () => {
  it('explica as duas unidades, onde a escolha é feita e o que as horas contam', () => {
    const { container, root } = renderIntoContainer(<HowItWorksContent />);
    const section = helpLimitsSection(container);

    expect(section).not.toBe('');
    expect(section).toContain('quilômetros');
    expect(section).toContain('horas de pedalagem');
    expect(section).toContain('desde a última manutenção');
    // A escolha acontece no editor do limite (PRD, objetivo O3).
    expect(section).toContain('escolhida pelo próprio atleta');

    act(() => root.unmount());
  });

  it('mantém a instrução de salvar e as três referências de imagem', () => {
    const { container, root } = renderIntoContainer(<HowItWorksContent />);

    expect(container.textContent).toContain('Salvar');

    const srcs = Array.from(container.querySelectorAll('img')).map((img) =>
      img.getAttribute('src'),
    );
    // O next/image prefixa com /_next/image?url= — compara pelo nome do arquivo.
    expect(srcs.some((src) => src?.includes('threshold-screen.png'))).toBe(true);
    expect(srcs.some((src) => src?.includes('threshold-editor.png'))).toBe(true);
    expect(srcs.some((src) => src?.includes('threshold-progress-bar.png'))).toBe(
      true,
    );

    act(() => root.unmount());
  });

  it('descreve o step como incremento das setas, sem prometer rejeição', () => {
    const { container, root } = renderIntoContainer(<HowItWorksContent />);

    expect(container.textContent).toContain('As setas do campo avançam');
    // O step é só o incremento das setas do campo; o salvamento não valida o
    // step, então a ajuda não pode prometer restrição que o código não impõe.
    expect(container.textContent).not.toContain('aceita múltiplos de 100');

    act(() => root.unmount());
  });

  it('o Readme reflete o formato persistido e as faixas, sem perder as instruções de teste', () => {
    const section = readmeLimitsSection();

    expect(section).not.toBe('');
    // Formato novo gravado pela migração de contrato (task 03).
    expect(section).toContain("unit: 'km' | 'h'");
    expect(section).not.toContain('[equipmentId]: number');
    // Normalização acontece na leitura; a gravação antiga não é regravada.
    expect(section).toContain('normalizados na leitura');
    // Faixas de estado continuam as mesmas, avaliadas na unidade do limite.
    expect(section).toContain('normal');
    expect(section).toContain('warning');
    expect(section).toContain('overdue');
    // Instruções de teste existentes preservadas (lista de testes relacionados
    // ampliada na atualização do Readme; os arquivos originais seguem citados).
    expect(section).toContain('# rodar apenas os testes relacionados');
    expect(section).toContain('yarn vitest');
    expect(section).toContain(
      'tests/unit/components/card-detail-modal.save.test.tsx',
    );
    expect(section).toContain(
      'tests/unit/components/card-item.progress.test.tsx',
    );
  });

  it('nenhum dos dois textos descreve o limite como sendo somente em quilômetros', () => {
    const { container, root } = renderIntoContainer(<HowItWorksContent />);
    const help = helpLimitsSection(container);
    const readme = readmeLimitsSection();

    // Redação nova obrigatória nos dois textos.
    expect(help).toContain('horas de pedalagem');
    expect(readme).toContain('horas de pedalagem');

    // Redações antigas que falavam só em quilômetros não podem voltar.
    expect(help).not.toMatch(/\(em km\)/);
    expect(help).not.toMatch(/defina o valor do limite em km/);
    expect(readme).not.toContain('limite de distância (em km)');

    act(() => root.unmount());
  });
});
