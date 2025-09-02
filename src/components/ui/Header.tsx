
import styles from './Header.module.css';

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <h1 className={styles.title}>Analisador de PSD</h1>
      </div>
    </header>
  );
};

export default Header;
