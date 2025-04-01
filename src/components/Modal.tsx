import React, { ReactNode } from 'react';

import styles from '../styles/components/Modal.module.css';

type Props = {
  children: ReactNode;
  id: string;
  closeModal: () => void;
};

export function Modal({ children, id, closeModal }: Props) {
  return (
    <div
      id={id}
      className={`${styles.modalContainer} modal`}
      onClick={closeModal}
      role='dialog'
      aria-modal='true'
    >
      <div className={styles.modalContent}>
        <div className={styles.modalInfo}>{children}</div>
      </div>
    </div>
  );
}
