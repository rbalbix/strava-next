import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Header from '../components/Header';
import Stats from '../components/Stats';
import { AuthProvider } from '../contexts/AuthContext';
import styles from '../styles/pages/Home.module.css';

interface HomeProps {
  code: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
  response_type: string;
  redirect_uri: string;
  approval_prompt: string;
  scope: string;
}

export default function Home(props: HomeProps) {
  return (
    <AuthProvider
      codeReturned={props.code}
      client_id={props.client_id}
      client_secret={props.client_secret}
      grant_type={props.grant_type}
      response_type={props.response_type}
      redirect_uri={props.redirect_uri}
      approval_prompt={props.approval_prompt}
      scope={props.scope}
    >
      <div className={styles.container}>
        <Head>
          <title>Strava Stats</title>
        </Head>

        <Header />

        <section>{props.code !== '' && <Stats />}</section>
      </div>
    </AuthProvider>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { code } = ctx.query;

  const client_id = process.env.CLIENT_ID;
  const client_secret = process.env.CLIENT_SECRET;
  const grant_type = process.env.GRANT_TYPE;

  const response_type = process.env.RESPONSE_TYPE;
  const redirect_uri =
    process.env.NODE_ENV === 'development'
      ? process.env.REDIRECT_URI_DEV
      : process.env.REDIRECT_URI;
  const approval_prompt = process.env.APPROVAL_PROMPT;
  const scope = process.env.STRAVA_SCOPE;

  return {
    props: {
      code: code ?? '',
      client_id,
      client_secret,
      grant_type,
      response_type,
      redirect_uri,
      approval_prompt,
      scope,
    },
  };
};
