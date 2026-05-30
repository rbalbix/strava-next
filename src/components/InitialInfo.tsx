import HowItWorksContent from './HowItWorksContent';
import styles from '../styles/components/InitialInfo.module.css';

export default function InitialInfo() {
  return (
    <div className={styles.initialInfoContainer}>
      <main>
        <HowItWorksContent />
      </main>
    </div>
  );
}
