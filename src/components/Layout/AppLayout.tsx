
import Header from '../ui/Header';
import styles from './AppLayout.module.css';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
