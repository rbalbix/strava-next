import SeoHead from '../components/SeoHead';
import PublicPageNav from '../components/PublicPageNav';
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
          O GearLife conecta sua conta Strava para consolidar estatísticas de uso
          dos seus equipamentos e facilitar decisões de manutenção.
        </p>

        <h2>1. Conecte sua conta Strava</h2>
        <p>
          Você faz login com OAuth no Strava e autoriza acesso de leitura ao
          perfil e às atividades.
        </p>

        <h2>2. Processamento de atividades</h2>
        <p>
          As atividades são associadas ao equipamento usado e processadas para
          gerar métricas de distância, tempo de uso e histórico.
        </p>

        <h2>3. Acompanhamento de componentes</h2>
        <p>
          O painel organiza dados por bike/equipamento e ajuda a identificar
          quando está na hora de revisar, trocar ou ajustar componentes.
        </p>
      </article>
    </main>
  );
}
