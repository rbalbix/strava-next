import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useContext } from 'react';
import ChainIcon from '../components/ChainIcon';
import ErroMsg from '../components/ErroMsg';
import Footer from '../components/Footer';
import Header from '../components/Header';
import SeoHead from '../components/SeoHead';
import { AuthContext, AuthProvider } from '../contexts/AuthContext';
import styles from '../styles/pages/Home.module.css';

const Stats = dynamic(() => import('../components/Stats'), {
  loading: () => <div className={styles.homeLoading}>Carregando...</div>,
});
const ModalContainer = dynamic(() => import('../components/ModalContainer'));

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

function HomeContent() {
  const { codeReturned } = useContext(AuthContext);
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'v0.2.0';

  return (
    <section className={styles.homeSection}>
      {codeReturned ? (
        <Stats />
      ) : (
        <>
          <div className={styles.homeText}>
            <ErroMsg />
            <h1>GearLife</h1>
            <h2>Monitor your gear.</h2>
            <h2>Ride smarter.</h2>
          </div>

          <div className={styles.versionMark}>
            <ChainIcon className={styles.chainIcon} />
            <small className={styles.versionText}>{appVersion}</small>
            <nav className={styles.marketingNav} aria-label='Conteúdo público'>
              <Link href='/como-funciona'>Como funciona</Link>
              <Link href='/faq'>FAQ</Link>
              <Link href='/privacidade'>Privacidade</Link>
              <Link href='/contato'>Contato</Link>
            </nav>
          </div>
        </>
      )}
    </section>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res } = context;
  const cookies = req.headers.cookie || '';

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

  const isAnonymous = !code && athlete_id === null;
  if (isAnonymous) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  } else {
    res.setHeader('Cache-Control', 'private, no-store');
  }

  return {
    props: {
      code,
      client_id: '',
      grant_type: '',
      response_type: '',
      approval_prompt: '',
      scope: '',
      oauth_state: '',
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
        <SeoHead
          title='GearLife | Monitor your gear and ride smarter'
          description='Conecte sua conta Strava, acompanhe estatísticas dos seus equipamentos e saiba o momento certo de manutenção.'
          path='/'
        />

        <Header />
        <HomeContent />

        <Footer />
      </div>
    </AuthProvider>
  );
}
