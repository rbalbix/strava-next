import SeoHead from '../components/SeoHead';
import PublicPageNav from '../components/PublicPageNav';
import styles from '../styles/pages/PublicPage.module.css';

export default function PrivacidadePage() {
  return (
    <main className={styles.container}>
      <SeoHead
        title='Privacidade | GearLife'
        description='Política de privacidade do GearLife: quais dados são tratados, por que são tratados e como proteger sua conta Strava.'
        path='/privacidade'
      />
      <PublicPageNav />

      <article className={styles.content}>
        <h1>Privacidade</h1>
        <p>
          O GearLife utiliza dados da sua conta Strava exclusivamente para
          entregar funcionalidades de análise de uso dos equipamentos.
        </p>

        <h2>Dados coletados</h2>
        <ul>
          <li>Informações básicas da conta esportiva.</li>
          <li>Atividades necessárias para cálculo de estatísticas.</li>
          <li>Dados de equipamento associados às atividades.</li>
        </ul>

        <h2>Finalidade</h2>
        <p>
          Os dados são usados para consolidar métricas, exibir histórico e apoiar
          manutenção preventiva do seu setup.
        </p>

        <h2>Revogação de acesso</h2>
        <p>
          Você pode revogar a permissão do app a qualquer momento na sua conta
          Strava em aplicativos conectados.
        </p>
      </article>
    </main>
  );
}
