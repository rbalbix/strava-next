import SeoHead from '../components/SeoHead';
import PublicPageNav from '../components/PublicPageNav';
import HowItWorksContent from '../components/HowItWorksContent';
import styles from '../styles/pages/PublicPage.module.css';

export default function ComoFuncionaPage() {
  return (
    <main className={styles.container}>
      <SeoHead
        title='Como funciona | GearLife'
        description='Entenda como o GearLife conecta com o Strava e transforma suas atividades em métricas práticas de manutenção de equipamentos.'
        path='/como-funciona'
      />
      <PublicPageNav />

      <article className={styles.content}>
        <h1>Como funciona o GearLife</h1>
        <p>
          O GearLife conecta sua conta Strava para consolidar estatísticas de
          uso dos seus equipamentos e facilitar decisões de manutenção.
        </p>
        <HowItWorksContent showTopHeading={false} />
      </article>
    </main>
  );
}
