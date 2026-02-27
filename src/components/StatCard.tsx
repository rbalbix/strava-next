import styles from '../styles/components/StatCard.module.css';

interface StatCardProps {
  value: string | number;
  label: string;
  icon: string;
}

export default function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
