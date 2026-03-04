/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import MyApp from '../../../src/pages/_app';
import MyDocument from '../../../src/pages/_document';
import SitemapXml, { getServerSideProps as sitemapGssp } from '../../../src/pages/sitemap.xml';

vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div>analytics</div>,
}));
vi.mock('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => <div>speed-insights</div>,
}));
vi.mock('next/document', () => ({
  __esModule: true,
  default: class Document {},
  Html: ({ children }: any) => <html>{children}</html>,
  Head: ({ children }: any) => <head>{children}</head>,
  Main: () => <main>main</main>,
  NextScript: () => <script>script</script>,
}));

describe('base pages', () => {
  it('_app renders page component and vercel helpers', () => {
    const Component = () => <div>page-content</div>;
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<MyApp Component={Component as any} pageProps={{}} router={{} as any} />));
    expect(container.textContent).toContain('page-content');
    expect(container.textContent).toContain('analytics');
    expect(container.textContent).toContain('speed-insights');
    act(() => root.unmount());
  });

  it('_document render returns html structure', () => {
    const doc = new MyDocument({});
    const tree = doc.render() as any;
    expect(tree).toBeTruthy();
  });

  it('sitemap gssp writes xml and page returns null', async () => {
    const setHeader = vi.fn();
    const write = vi.fn();
    const end = vi.fn();
    const result = await sitemapGssp({ res: { setHeader, write, end } } as any);
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/xml; charset=utf-8',
    );
    expect(write).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
    expect(result).toEqual({ props: {} });
    expect(SitemapXml()).toBeNull();
  });
});
