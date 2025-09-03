import { GetServerSideProps } from 'next';
import Head from 'next/head';
import ErroMsg from '../components/ErroMsg';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Stats from '../components/Stats';
import { AuthProvider } from '../contexts/AuthContext';
import styles from '../styles/pages/Home.module.css';
import { APP_CONFIG } from '../config';

interface HomeProps {
  code: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
  response_type: string;
  approval_prompt: string;
  scope: string;
  athlete_id: number;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context;
  const cookies = req.headers.cookie || '';

  console.log(cookies);

  let code = null;
  const codeCookie = cookies
    .split(';')
    .find((c) => c.trim().startsWith('strava_code='));
  if (codeCookie) {
    code = codeCookie.split('=')[1];
  }

  let athlete_id = null;
  const athleteIdCookie = cookies
    .split(';')
    .find((c) => c.trim().startsWith('strava_athleteId='));
  if (codeCookie) {
    athlete_id = athleteIdCookie.split('=')[1];
  }

  return {
    props: {
      code,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: process.env.GRANT_TYPE,
      response_type: process.env.RESPONSE_TYPE,
      approval_prompt: process.env.APPROVAL_PROMPT,
      scope: process.env.STRAVA_SCOPE,
      athlete_id,
    },
  };
};

export default function Home(props: HomeProps) {
  console.log(`NODE ENV: ${process.env.NODE_ENV}`);
  console.log(`PUBLIC URL: ${APP_CONFIG.appUrl}`);
  return (
    <AuthProvider
      codeReturned={props.code}
      client_id={props.client_id}
      client_secret={props.client_secret}
      grant_type={props.grant_type}
      response_type={props.response_type}
      approval_prompt={props.approval_prompt}
      scope={props.scope}
      athlete_id={props.athlete_id}
    >
      <div className={styles.container}>
        <Head>
          <title>Stuff Stats</title>
        </Head>

        <Header />

        <section>
          {props.code ? (
            <Stats />
          ) : (
            <div className={styles.homeText}>
              <ErroMsg />
              <h1>Stuff</h1>
              <h1>Stats.</h1>
            </div>
          )}
        </section>

        <Footer />
      </div>
    </AuthProvider>
  );
}
