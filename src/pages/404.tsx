import Link from 'next/link';
import SeoHead from '../components/SeoHead';
import PublicPageNav from '../components/PublicPageNav';
import styles from '../styles/pages/PublicPage.module.css';

/**
 * Página de erro 404.
 *
 * Antes o Next servia o 404 padrão em inglês ("This page could not be found"),
 * sem navegação — quem chegava por link antigo ou URL digitada errada ficava
 * num beco sem saída, fora do funil de landing que passou a existir no PR 1.
 */
export default function NotFoundPage() {
  return (
    <main className={styles.container}>
      <SeoHead
        title='Página não encontrada | GearLife'
        description='A página que você procura não existe. Volte para o início do GearLife.'
        path='/404'
      />
      <PublicPageNav />

      <article className={styles.content}>
        <h1>Página não encontrada</h1>
        <p>
          O endereço que você acessou não existe ou foi movido. Confira o link
          ou volte para o início.
        </p>
        <p>
          <Link href='/'>Voltar para o início</Link>
        </p>
      </article>
    </main>
  );
}
