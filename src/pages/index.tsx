import { randomBytes } from 'crypto';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import ErroMsg from '../components/ErroMsg';
import Footer from '../components/Footer';
import Header from '../components/Header';
import ModalContainer from '../components/ModalContainer';
import Stats from '../components/Stats';
import { AuthProvider } from '../contexts/AuthContext';
import styles from '../styles/pages/Home.module.css';

interface HomeProps {
  code: string | null;
  client_id?: string;
  grant_type?: string;
  response_type?: string;
  approval_prompt?: string;
  scope?: string;
  oauth_state: string;
  athlete_id: number | null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res } = context;
  const cookies = req.headers.cookie || '';
  const isProd = process.env.NODE_ENV === 'production';
  const secureFlag = isProd ? 'Secure; ' : '';

  let code = null;
  const codeCookie = cookies
    .split(';')
    .find((c) => c.trim().startsWith('strava_code='));
  if (codeCookie) {
    code = codeCookie.split('=')[1];
  }

  let athlete_id: number | null = null;
  const athleteIdCookie = cookies
    .split(';')
    .find((c) => c.trim().startsWith('strava_athleteId='));
  if (athleteIdCookie) {
    const parsed = Number(athleteIdCookie.split('=')[1]);
    athlete_id = Number.isFinite(parsed) ? parsed : null;
  }

  const oauthState = randomBytes(24).toString('hex');
  const oauthStateCookie = `strava_oauth_state=${oauthState}; Path=/; Max-Age=600; HttpOnly; ${secureFlag}SameSite=Lax`;
  const currentSetCookie = res.getHeader('Set-Cookie');
  if (!currentSetCookie) {
    res.setHeader('Set-Cookie', oauthStateCookie);
  } else if (Array.isArray(currentSetCookie)) {
    res.setHeader('Set-Cookie', [...currentSetCookie, oauthStateCookie]);
  } else {
    res.setHeader('Set-Cookie', [String(currentSetCookie), oauthStateCookie]);
  }

  return {
    props: {
      code,
      client_id: process.env.CLIENT_ID,
      grant_type: process.env.GRANT_TYPE,
      response_type: process.env.RESPONSE_TYPE,
      approval_prompt: process.env.APPROVAL_PROMPT,
      scope: process.env.STRAVA_SCOPE,
      oauth_state: oauthState,
      athlete_id,
    },
  };
};

export default function Home(props: HomeProps) {
  return (
    <AuthProvider
      codeReturned={props.code}
      client_id={props.client_id}
      grant_type={props.grant_type}
      response_type={props.response_type}
      approval_prompt={props.approval_prompt}
      scope={props.scope}
      oauth_state={props.oauth_state}
      athlete_id={props.athlete_id}
    >
      <ModalContainer />
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
              <h1>GearLife</h1>
              <h2>Monitor your gear.</h2>
              <h2> Ride smarter.</h2>
            </div>
          )}
        </section>

        <Footer />
      </div>
    </AuthProvider>
  );
}
