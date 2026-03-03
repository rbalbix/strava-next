import SeoHead from '../components/SeoHead';
import PublicPageNav from '../components/PublicPageNav';
import styles from '../styles/pages/PublicPage.module.css';

export default function FaqPage() {
  return (
    <main className={styles.container}>
      <SeoHead
        title='FAQ | GearLife'
        description='Perguntas frequentes sobre login com Strava, privacidade de dados, atualização das métricas e funcionamento do GearLife.'
        path='/faq'
      />
      <PublicPageNav />

      <article className={styles.content}>
        <h1>Perguntas frequentes</h1>

        <h2>O GearLife altera dados no meu Strava?</h2>
        <p>
          Não. O app usa dados para leitura e cálculo de estatísticas, sem
          publicar atividades automaticamente.
        </p>

        <h2>Com que frequência as métricas atualizam?</h2>
        <p>
          As métricas atualizam quando novas atividades são processadas e em
          eventos do webhook do Strava.
        </p>

        <h2>Posso desconectar minha conta?</h2>
        <p>
          Sim. Você pode sair da sessão no app e revogar permissões direto no
          painel de aplicações conectadas do Strava.
        </p>

        <h2>Quais dados são usados?</h2>
        <p>
          Dados de perfil esportivo e atividades necessárias para cálculo de uso
          de equipamentos e componentes.
        </p>
      </article>
    </main>
  );
}
