import { TestStatus } from '@/types';
import styles from './summary.module.css'
import { useSocketContext } from '@/hooks/useSocketContext';
import { useMemo } from 'react';
import Image from 'next/image';
import Total from '/public/total.svg'
import Passed from '/public/passed.svg'
import Failed from '/public/failed.svg'
import Pending from '/public/pending.svg'


/**
 * 
 * @author Mayank Gupta
 */
const Summary = () => {
    const { results } = useSocketContext();
    const testSummary = useMemo(() => [
        {
            summaryType: 'Total',
            backgroundColor: '#b5d4ff',
            imageAddr: Total,
            count: results.length,
        },
        {
            summaryType: 'Passed',
            backgroundColor: '#A8EAEE',
            imageAddr: Passed,
            count: results.reduce((value, current) => value + (current.status == TestStatus.Passed ? 1 : 0), 0)

        },
        {
            summaryType: 'Failed',
            backgroundColor: '#FCBFE0',
            imageAddr: Failed,
            count: results.reduce((value, current) => value + (current.status == TestStatus.Failed ? 1 : 0), 0),
        },
        {
            summaryType: 'Running',
            backgroundColor: '#d1c7ff',
            imageAddr: Pending,

            count: results.reduce((value, current) => value + (current.status == TestStatus.Running ? 1 : 0), 0)
        }
    ], [results]);

    return (
        <div className={styles['summary']}>
            {testSummary.map((item, id) => (

                <div key={id} className={styles['summary-card']}>
                    <div className={styles['summary-card-content']}>
                        <div className={styles['summary-card-count']}>{item.count}</div>
                        <div className={styles['summary-card-type']}>{item.summaryType}</div>
                    </div>
                    <div className={styles['summary-card-image-container']} style={{ backgroundColor: item.backgroundColor }}>
                        <Image src={item.imageAddr} alt={item.summaryType} height={20} width={20} />
                    </div>
                </div>
            ))}
        </div>
    )
};

export default Summary;

