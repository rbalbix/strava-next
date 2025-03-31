import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang='pt-BR'>
        <Head>
          <meta charSet='UTF-8' />
          <link
            rel='stylesheet'
            href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap'
          />
          <meta
            name='description'
            content='This app can connect to Strava and calculate some stats of your equipment to be closely monitored.'
          />
          <link rel='shortcut icon' href='/favicon.png' type='image/png' />
          <link rel='preconnect' href='https://fonts.gstatic.com' />
          <meta name='robots' content='index, follow' />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
