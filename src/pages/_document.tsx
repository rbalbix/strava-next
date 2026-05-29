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
          <meta name='theme-color' content='#fc4c02' />
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
