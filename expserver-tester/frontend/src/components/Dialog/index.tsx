import { FC, MouseEventHandler } from 'react';
import styles from './dialog.module.css'

export interface DialogProps {
    testNo: number,
    handleDialog: MouseEventHandler,
    title: string,
    description: string,
    expectedBehaviour: string,
    observedBehaviour: string,
    testInput: string,
}


/**
 * Dialog component to display test case failure details.
 *
 * This component provides a modal-like dialog that shows information
 * about a failed test case, including expected and observed behavior.
 */
const Dialog: FC<DialogProps> = ({
    testNo,
    handleDialog,
    title,
    description,
    expectedBehaviour = "",
    observedBehaviour = "",
    testInput = "",
}) => {
    return (
        <div className={styles['dialog']}>
            <div className={styles['dialog-container']}>
                <div className={styles['dialog-title-container']}> Testcase {testNo} failed!

                    <button className={styles['dialog-close-button']} onClick={handleDialog}>Close</button>
                </div>
                <div className={styles['dialog-content-container']}>
                    <div className={styles['dialog-content-title']}>{title}</div>
                    <div className={styles['dialog-content-description']}>{description}</div>
                    {
                        expectedBehaviour !== "" &&
                        <div className={styles['dialog-content-expected']}>
                            <span className={styles['dialog-subtitles']}>
                                Expected Behaviour:
                            </span>
                            {expectedBehaviour}
                        </div>
                    }
                    {
                        observedBehaviour !== "" &&
                        <div className={styles['dialog-content-observed']}>
                            <span className={styles['dialog-subtitles']}>
                                Observed Behaviour:
                            </span>
                            {observedBehaviour}
                        </div>
                    }
                    {
                        testInput !== "" &&
                        <div className={styles['dialog-content-input']}>
                            <span className={styles['dialog-subtitles']}>
                                Test Input:
                            </span>
                            {testInput}
                        </div>
                    }
                </div>
            </div>
        </div>
    )
};

export default Dialog;