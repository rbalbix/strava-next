import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useContext } from 'react';
import ErroMsg from '../components/ErroMsg';
import Header from '../components/Header';
import Stats from '../components/Stats';
import { AuthContext, AuthProvider } from '../contexts/AuthContext';
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
  const {
    codeError,
    athlete,
    codeReturned,
    client_id,
    response_type,
    redirect_uri,
    approval_prompt,
    scope,
    signOut,
  } = useContext(AuthContext);

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

        <section>
          {props.code ? (
            <Stats />
          ) : (
            <div className={styles.homeText}>
              <ErroMsg />
              <h1>Strava</h1>
              <h1>Stats.</h1>
            </div>
          )}
        </section>
      </div>
    </AuthProvider>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async (ctx) => {
  const { code } = ctx.params;

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
      code: code ? code[0] : null,
      client_id,
      client_secret,
      grant_type,
      response_type,
      redirect_uri,
      approval_prompt,
      scope,
    },
    revalidate: 60 * 60 * 4, // 4 hours
  };
};
