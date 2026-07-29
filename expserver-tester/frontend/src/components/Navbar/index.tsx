"use client"
import styles from './navbar.module.css';
import logo from "/public/logo.svg"
import Image from 'next/image';

const Navbar = () => {
    return (
        <div className={styles.navbar}>
            <Image src={logo} alt='logo' className={styles['navbar-logo']} draggable={false} />
        </div>
    )
}

export default Navbar;