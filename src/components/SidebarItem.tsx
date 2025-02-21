import React, { useContext } from 'react';
import styles from '../styles/components/SidebarItem.module.css';
import { AuthContext } from '../contexts/AuthContext';

export default function SidebarItem({ Icon, Text, Content }) {
  const { athlete, handleOpenModal } = useContext(AuthContext);
  return (
    <div
      className={styles.sidebarItemContainer}
      onClick={() => handleOpenModal(athlete.id)}
    >
      <Icon />
      {Text}
      <Content />
    </div>
  );
}
