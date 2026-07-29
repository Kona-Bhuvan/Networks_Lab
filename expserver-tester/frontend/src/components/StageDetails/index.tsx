import { useState } from 'react';
import Description from './Description';
import styles from './styles.module.css'
import Terminal from './Terminal';


/**
 * 
 * @author Mayank Gupta
 */
const StageDetails = () => {
    const [terminalState, setTerminalState] = useState<boolean>(false);

    const handleTerminalState = (state) => {
        setTerminalState(state);
    }
    return (
        <div className={styles['desc-terminal-container']}>
            <div className={styles['desc-terminal-navbar']}>
                <div className={`${styles['desc-terminal-nav-option']} ${!terminalState && styles['active-nav-desc']}`} onClick={() => handleTerminalState(false)}>Description</div>
                <div className={`${styles['desc-terminal-nav-option']} ${terminalState && styles['active-nav-terminal']}`} onClick={() => handleTerminalState(true)}>Console</div>
            </div>
            {
                terminalState ? <Terminal /> : <Description />
            }
        </div>
    )
};

export default StageDetails;