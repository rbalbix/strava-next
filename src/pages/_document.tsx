import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang='pt-BR'>
        <Head>
          <meta charSet='UTF-8' />
          <meta name='application-name' content='GearLife' />
          <meta name='apple-mobile-web-app-capable' content='yes' />
          <meta name='apple-mobile-web-app-title' content='GearLife' />
          <meta name='apple-mobile-web-app-status-bar-style' content='default' />
          <meta name='mobile-web-app-capable' content='yes' />
          {/* theme-color único e fiel ao fundo real (P3): a meta laranja
              (#fc4c02) brigava com a do SeoHead (#121212) e nenhuma
              acompanhava --gl-surface-primary. Uma por tema, via media
              query — o browser escolhe a que casa com o esquema atual. */}
          <meta
            name='theme-color'
            content='#fcfcfc'
            media='(prefers-color-scheme: light)'
          />
          <meta
            name='theme-color'
            content='#0f1115'
            media='(prefers-color-scheme: dark)'
          />
          <link rel='shortcut icon' href='/favicon.png' type='image/png' />
          <link rel='apple-touch-icon' href='/icons/icon-192.png' />
          <link rel='manifest' href='/manifest.webmanifest' />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
