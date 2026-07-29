import { useSocketContext } from '@/hooks/useSocketContext';
import styles from './testContainer.module.css'
import { FC, useMemo } from 'react';
import TestCard from '../TestCard';
import Summary from '../Summary';


/**
 * TestContainer Component
 *
 * Manages and displays test results when a binary file is uploaded.
 * Uses socket context to fetch test results dynamically.
 * 
 * @author Mayank Gupta
 */
const TestContainer: FC = () => {
    const { binaryId, results } = useSocketContext();

    const fileUploaded = useMemo(() => {
        if (binaryId)
            return true;
        else
            return false;
    }, [binaryId])

    return (
        <div className={styles['test-container']}>
            {fileUploaded ?
                <div className={styles['test-container-active']}>
                    <div className={styles['testcase-container']}>
                        {
                            // <TestCard key={1} testStatus={'failed'} testNo={1} testResult = {result} />
                            results.map((result, index) => {
                                return <TestCard key={index} testStatus={result.status} testNo={index + 1} result={result} />
                            })
                            
                        }
                        {/* {
                            // <TestCard key={1} testStatus={'failed'} testNo={1} testResult = {result} />
                            results.map((result, index) => {
                                return <TestCard key={index} testStatus={result.status} testNo={index + 1} result={result} />
                            })
                            
                        }
                        {
                            // <TestCard key={1} testStatus={'failed'} testNo={1} testResult = {result} />
                            results.map((result, index) => {
                                return <TestCard key={index} testStatus={result.status} testNo={index + 1} result={result} />
                            })
                            
                        } */}
                        
                    </div>
                    <Summary />


                </div> :
                <div className={styles['test-container-idle']}> Upload a binary file to test</div>}
        </div>
    )
}

export default TestContainer;