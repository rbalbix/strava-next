import Image from 'next/image';
import { memo } from 'react';
import styles from '../styles/components/DiskIcon.module.css';

function DiskIcon() {
  return (
    <Image
      className={styles.container}
      src='/disk.svg'
      width={200}
      height={200}
      alt='Ícone de disco'
      priority
    />
  );
}

export default memo(DiskIcon);
