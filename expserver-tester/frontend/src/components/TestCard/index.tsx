import { type TestDetails, type TestStatus } from '@/types';
import styles from './testcard.module.css'
import Image from 'next/image';
import Info from '/public/info.svg'
import { FC, useState } from 'react';
import Dialog from '../Dialog';

export interface TestCardProps {
    testNo: number,
    result: TestDetails,
    testStatus: TestStatus,
}


/**
 * TestCard Component
 *
 * Represents a single test case result with a status indicator.
 * If the test fails, it provides additional details in a dialog.
 * 
 * @author Mayank Gupta
 */
const TestCard: FC<TestCardProps> = ({
    testNo,
    result,
    testStatus,
}) => {
    const [dialog, setDialog] = useState<boolean>(false);
    const handleDialog = () => {
        setDialog((prevDialog) => !prevDialog);
    }

    return (
        <div className={styles['test-card']}>
            <div className={styles['test-name']}> Testcase {testNo}
                {result.status === 'failed' &&
                    <div className={styles['test-info']}>
                        <Image className={styles['test-info-img']} src={Info} alt='info' height={16} width={16} onClick={handleDialog}></Image>
                    </div>
                }
            </div>
            {dialog &&
                <>
                    <Dialog
                        title={result.title}
                        testNo={testNo}
                        description={result.description}
                        expectedBehaviour={result.expectedBehavior}
                        observedBehaviour={result.observedBehavior}
                        testInput={result.testInput}
                        handleDialog={handleDialog}
                    />
                    {/* <button className={styles['dialog-close-button-container']} onClick={handleDialog}>Close</button> */}
                </>
            }
            <div className={`${styles['test-status']} ${styles[testStatus]}`}>{result.status.replace(/^\w/, (c) => c.toUpperCase())}</div>
        </div>
    )
};

export default TestCard;