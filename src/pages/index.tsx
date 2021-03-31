import Head from 'next/head';
import Header from '../components/Header';
import styles from '../styles/pages/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Strava Stats</title>
      </Head>

      <Header />
    </div>
  );
}
