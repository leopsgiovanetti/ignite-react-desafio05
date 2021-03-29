import Link from 'next/link';
import styles from './header.module.scss';
import commonStyles from '../../styles/common.module.scss';

export default function Header(): JSX.Element {
  return (
    <header className={commonStyles.content}>
      <Link href="/">
        <a className={styles.headerContent}>
          <img src="/logo.svg" alt="logo" />
        </a>
      </Link>
    </header>
  );
}
