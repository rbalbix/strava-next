import Link from 'next/link';
import styles from '../styles/pages/PublicPage.module.css';

export default function PublicPageNav() {
  return (
    <nav className={styles.topNav} aria-label='Navegação pública'>
      <Link href='/'>Início</Link>
      <Link href='/como-funciona'>Como funciona</Link>
      <Link href='/faq'>FAQ</Link>
      <Link href='/privacidade'>Privacidade</Link>
      <Link href='/contato'>Contato</Link>
    </nav>
  );
}
