import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useContext } from 'react';
import Header from '../components/Header';
import MainImage from '../components/MainImage';
import PublicPageNav from '../components/PublicPageNav';
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
  const { codeReturned, openModal } = useContext(AuthContext);

  return (
    <main
      className={codeReturned ? styles.statsSection : styles.homeSection}
      aria-live='polite'
    >
      {/* A landing não renderiza <ErroMsg /> de propósito: `codeError` só é
          preenchido pelo `Stats`, então um aviso de erro aqui seria sempre o
          resíduo de uma falha do painel — e a frase ("Sua sessão com o Strava
          expirou ou foi revogada") não faz sentido para quem nunca saiu. Quem
          precisa voltar usa o CTA abaixo, que é autoexplicativo. */}
      {codeReturned ? (
        <Stats />
      ) : (
        <div className={styles.homeText}>
          <MainImage />
          {/* <h1 className={styles.brandTitle}>GearLife</h1> */}
          <h2 className={styles.tagline}>
            Pedale. A gente cuida da manutenção.
          </h2>
          <p className={styles.subtitle}>
            Conecte sua conta Strava e acompanhe, componente a componente,
            quanto já foi rodado desde a última manutenção — com alertas antes
            de a peça desgastar.
          </p>

          <div
            className={styles.ctaRow}
            role='group'
            aria-label='Ações principais'
          >
            <Link
              href='/api/oauth/start'
              prefetch={false}
              className={styles.ctaPrimary}
            >
              Entrar com Strava
            </Link>
            <button
              type='button'
              className={styles.ctaSecondary}
              onClick={() => {
                openModal('info');
              }}
            >
              Como funciona
            </button>
          </div>

          {/* Reaproveita a navegação das páginas públicas: o plano previa
              torná-la visível também na landing, em vez de duplicar os links
              aqui. */}
          {/* <PublicPageNav /> */}
        </div>
      )}
    </main>
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

  // A sessão é validada na primeira chamada de dados, não aqui.
  //
  // Seria possível consultar o Redis neste ponto (`strava:auth:<athleteId>`) e
  // pousar direto na landing quando a sessão tivesse ido embora. Não foi
  // feito, de propósito: o `/` autenticado pagaria 20–80 ms de bloqueio de
  // first-paint em **toda** visita para resolver um caso raro (registro
  // expirado, flush, revogação no Strava) — o mesmo erro de proporção do
  // polling de 5s do §8.2, só que no outro extremo.
  //
  // O caminho correto é o mesmo de qualquer app com sessão: o shell renderiza,
  // a chamada de dados responde 401 quando não há sessão
  // (`respondIfSessionMissing`, §8.6), e o cliente encerra a sessão e volta
  // para a landing. São ~300 ms uma única vez — e, como os cookies são limpos
  // nesse processo, a visita seguinte já cai direto na landing.
  const isAuthenticated = Boolean(code && athlete_id);

  // Sem sessão, renderiza a landing. Antes, qualquer visitante era redirecionado
  // para /api/oauth/start e dali para o Strava — o valor do produto, o aviso de
  // privacidade e os links de FAQ/contato nunca chegavam a aparecer. Além disso,
  // o mesmo caminho era percorrido por signOut(), que com erro persistente
  // (ex.: rate limit) entrava em loop de reautenticação.
  //
  // Esta página tem duas faces na mesma URL (`/`): landing para visitante e
  // painel para quem tem sessão — ambas decididas por cookie.
  //
  // Por isso NÃO pode ser cacheada. Um `public`/`s-maxage` aqui faria o
  // browser ou a CDN servir a landing em cache para um usuário recém-logado
  // (o redirect do OAuth volta justamente para `/`), trocando o antigo loop de
  // reautenticação por outro: veria "Entrar com Strava" em vez do painel e
  // clicaria de novo.
  //
  // A branch de landing também deixou de exibir a marca de versão
  // (`appVersion`): ela só existia neste bloco, que era inalcançável em
  // produção, e ao abrir a página para visitantes passaria a expor
  // informação de dev. Removida junto com o `.versionMark`/`.versionText`.
  res.setHeader('Cache-Control', 'private, no-store');

  return {
    props: {
      // Sessão parcial (ex.: só o athleteId) não pode renderizar o painel —
      // os dois valores são anulados juntos, para não reaproveitar um cookie
      // órfão na próxima visita.
      code: isAuthenticated ? code : null,
      client_id: '',
      grant_type: '',
      response_type: '',
      approval_prompt: '',
      scope: '',
      oauth_state: '',
      athlete_id: isAuthenticated ? athlete_id : null,
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
          title='GearLife | Manutenção da sua bike a partir do Strava'
          description='Conecte sua conta Strava, acompanhe estatísticas dos seus equipamentos e saiba o momento certo de manutenção.'
          path='/'
          noindex={Boolean(props.code)}
        />

        <Header />
        <HomeContent />

        {/* <Footer /> */}
      </div>
    </AuthProvider>
  );
}
