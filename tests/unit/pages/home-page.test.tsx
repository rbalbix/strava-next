/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import Home, { getServerSideProps } from '../../../src/pages/index';

vi.mock('next/dynamic', () => ({
  default: () => () => <div>dynamic</div>,
}));

vi.mock('next/link', () => ({
  default: ({ children }: any) => <a>{children}</a>,
}));

vi.mock('next/router', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('../../../src/components/SeoHead', () => ({ default: () => null }));
vi.mock('../../../src/components/Header', () => ({ default: () => <header>header</header> }));
vi.mock('../../../src/components/Footer', () => ({ default: () => <footer>footer</footer> }));
vi.mock('../../../src/components/ErroMsg', () => ({ default: () => <div>erro</div> }));
vi.mock('../../../src/components/ChainIcon', () => ({ default: () => <span>chain</span> }));
vi.mock('../../../src/components/ModalContainer', () => ({ default: () => <div>modal</div> }));

describe('home page', () => {
  it('renders marketing content when code is null', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(
        <Home
          code={null}
          oauth_state='state'
          athlete_id={null}
        />,
      );
    });
    expect(container.textContent).toContain('GearLife');
    expect(container.textContent).toContain('Como funciona');
    act(() => root.unmount());
  });

  it('getServerSideProps reads cookies and sets no-store cache', async () => {
    const setHeader = vi.fn();
    const result = await getServerSideProps({
      req: {
        headers: { cookie: 'strava_code=abc; strava_athleteId=123' },
      },
      res: { setHeader },
    } as any);

    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect((result as any).props.code).toBe('abc');
    expect((result as any).props.athlete_id).toBe(123);
  });
});
