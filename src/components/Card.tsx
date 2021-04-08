import styles from '../styles/components/Card.module.css';

export default function Card() {
  return (
    <div className={styles.cardContainer}>
      <header>Nome do Equipamento</header>
      <main>
        <p>1.000 km</p>
        <p>50.1 horas</p>
      </main>
    </div>
  );
}
