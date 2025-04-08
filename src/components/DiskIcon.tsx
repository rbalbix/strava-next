import { memo } from 'react';
import styles from '../styles/components/DiskIcon.module.css';

function DiskIcon() {
  return (
    <img
      className={styles.container}
      src='disk.svg'
      width='200'
      height='200'
      alt='Ícone de disco'
    />
  );
}

export default memo(DiskIcon);
