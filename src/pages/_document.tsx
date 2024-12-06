import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang='pt-BR'>
        <Head>
          <meta
            name='description'
            content='This app can connect to Strava and calculate some stats of your equipment to be closely monitored.'
          />

          <meta
            name='description'
            content='This app can connect to Strava and calculate some athlete stats.'
          />

          <link rel='shortcut icon' href='favicon.png' type='image/png' />

          <link rel='preconnect' href='https://fonts.gstatic.com' />
          <link
            href='https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap'
            rel='stylesheet'
          />

          <link
            href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'
            rel='stylesheet'
          ></link>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
