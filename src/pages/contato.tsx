import SeoHead from '../components/SeoHead';
import PublicPageNav from '../components/PublicPageNav';
import styles from '../styles/pages/PublicPage.module.css';

const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contato@gearlife.app';

export default function ContatoPage() {
  return (
    <main className={styles.container}>
      <SeoHead
        title='Contato | GearLife'
        description='Entre em contato com a equipe do GearLife para dúvidas, suporte e sugestões de melhoria.'
        path='/contato'
      />
      <PublicPageNav />

      <article className={styles.content}>
        <h1>Contato</h1>
        <p>
          Para dúvidas sobre funcionamento, segurança ou sugestões de melhoria,
          entre em contato pelo e-mail abaixo.
        </p>
        <p>
          <strong>E-mail:</strong>{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </p>
      </article>
    </main>
  );
}
