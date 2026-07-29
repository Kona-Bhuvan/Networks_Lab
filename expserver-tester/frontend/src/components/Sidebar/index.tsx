"use client"
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import styles from './sidebar.module.css'
// import { useSocketContext } from '@/hooks/useSocketContext';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import NavOptionIcon from './NavOptionIcon';

export type PhaseId = 'INTRO' | 'CUSTOM' | number
export interface NavOption {
    phase: string,
    phaseId: PhaseId,
    dropDownPresent: boolean,
    stages: number[],
}

/**
 * 
 * @author Mayank Gupta
 */
const Sidebar: FC = () => {
    const router = useRouter();
    const [currPhase, setCurrPhase] = useState<PhaseId>('INTRO');
    // const { stageNo } = useSocketContext();
    const pathname = usePathname();

    const navOptions: NavOption[] = useMemo(() => [
        {
            phase: 'Introduction',
            phaseId: 'INTRO',
            dropDownPresent: false,
            stages: []
        },
        // {
        //     phase: 'Custom',
        //     phaseId: 'CUSTOM',
        //     dropDownPresent: false,
        //     stages: []
        // },
        {
            phase: 'Phase 0',
            phaseId: 0,
            dropDownPresent: true,
            stages: [1, 3, 4, 5]
        },
        {
            phase: 'Phase 1',
            phaseId: 1,
            dropDownPresent: true,
            stages: [6, 7, 8, 9, 10, 11, 12, 13]
        },
        {
            phase: 'Phase 2',
            phaseId: 2,
            dropDownPresent: true,
            stages: [14, 15, 16, 17]
        },
        {
            phase: 'Phase 3',
            phaseId: 3,
            dropDownPresent: true,
            stages: [18, 19, 20, 21, 22]
        },
        {
            phase: 'Phase 4',
            phaseId: 4,
            dropDownPresent: true,
            stages: [23, 24, 25]
        }
    ], []);

    const currentStageFromPath = useMemo(() => {
        if (pathname.startsWith('/stages')) {
            const parts = pathname.split('/');
            const stageStr = parts[2];
            const parsedStage = parseInt(stageStr);
            return isNaN(parsedStage) ? null : parsedStage;
        }
        return null;
    }, [pathname]);

    const handlePhaseChange = useCallback((item: NavOption) => {
        setCurrPhase(item.phaseId);
        if (item.phaseId === 'INTRO') {
            router.push('/');
        }
    }, [router]);

    const handleStageChange = useCallback((stage: number) => {
        if (stage !== currentStageFromPath) {
            router.push(`/stages/${stage}`);
        }
    }, [currentStageFromPath, router]);

    const isRoadmapPhase = useCallback((phaseId: PhaseId): boolean => {
        return !(['INTRO', 'CUSTOM'].some((item) => item == phaseId))
    }, []);

    const containerClassName = useCallback((item: NavOption) => {
        const containerStyles = [
            styles['option-container'],
            currPhase == item.phaseId
                ? isRoadmapPhase(item.phaseId)
                    ? styles['active-option-container']
                    : styles['active-option-custom-intro']
                : styles['inactive-option-container']
        ]

        return containerStyles.join(' ');
    }, [currPhase, isRoadmapPhase]);

    useEffect(() => {
        if (pathname == '/') {
            setCurrPhase('INTRO')
        }
        else if (pathname.startsWith('/stages')) {
            const currentStage = parseInt(pathname.split('/')[2]);
            const currentPhase = navOptions.filter((item) => item.stages.includes(currentStage))[0];
            const currentPhaseId = (typeof currentPhase.phaseId != 'number')
                ? navOptions[0].phaseId
                : currentPhase.phaseId
            setCurrPhase(currentPhaseId);
        }
    }, [pathname, navOptions]);


    return (
        <div className={styles.sidebar}>
            {
                navOptions.map((item, id) => (
                    <div key={id} className={styles['option-main-container']}>
                        <button
                            className={containerClassName(item)}
                            onClick={() => handlePhaseChange(item)}
                        >
                            <NavOptionIcon active={currPhase === item.phaseId} iconType={item.phaseId} />
                            <div className={styles.phase}>{item.phase}</div>
                            {
                                item.dropDownPresent &&
                                <div className={styles['dropdown-img']}>
                                    {
                                        currPhase == item.phaseId ?
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 7.99972C11.7664 7.99927 11.5399 8.08064 11.36 8.22972L5.36003 13.2297C5.15581 13.3995 5.02739 13.6434 5.00301 13.9078C4.97863 14.1722 5.06029 14.4355 5.23003 14.6397C5.39977 14.8439 5.64368 14.9724 5.90811 14.9967C6.17253 15.0211 6.43581 14.9395 6.64003 14.7697L12 10.2897L17.36 14.6097C17.4623 14.6928 17.58 14.7548 17.7064 14.7923C17.8327 14.8297 17.9652 14.8418 18.0962 14.8278C18.2272 14.8139 18.3542 14.7742 18.4699 14.711C18.5855 14.6479 18.6875 14.5625 18.77 14.4597C18.8616 14.3569 18.931 14.2363 18.9738 14.1054C19.0166 13.9745 19.0319 13.8362 19.0187 13.6992C19.0056 13.5621 18.9643 13.4292 18.8974 13.3089C18.8305 13.1885 18.7395 13.0833 18.63 12.9997L12.63 8.16972C12.4449 8.04421 12.2231 7.98435 12 7.99972Z" fill="white" />
                                            </svg> :
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 16.0003C11.7664 16.0007 11.5399 15.9194 11.36 15.7703L5.36003 10.7703C5.15581 10.6005 5.02739 10.3566 5.00301 10.0922C4.97863 9.82777 5.06029 9.56449 5.23003 9.36028C5.39977 9.15606 5.64368 9.02763 5.90811 9.00325C6.17253 8.97888 6.43581 9.06054 6.64003 9.23028L12 13.7103L17.36 9.39028C17.4623 9.30721 17.58 9.24518 17.7064 9.20775C17.8327 9.17031 17.9652 9.15822 18.0962 9.17216C18.2272 9.1861 18.3542 9.2258 18.4699 9.28897C18.5855 9.35214 18.6875 9.43755 18.77 9.54028C18.8616 9.6431 18.931 9.76372 18.9738 9.8946C19.0166 10.0255 19.0319 10.1638 19.0187 10.3008C19.0056 10.4379 18.9643 10.5708 18.8974 10.6911C18.8305 10.8115 18.7395 10.9167 18.63 11.0003L12.63 15.8303C12.4449 15.9558 12.2231 16.0156 12 16.0003Z" fill="black" />
                                            </svg>
                                    }

                                </div>
                            }
                        </button>
                        <AnimatePresence>
                            {
                                currPhase == item.phaseId &&
                                <motion.div
                                    className={styles['stage-container']}
                                    initial={{ height: 0, opacity: 1 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 1 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                >
                                    {item.stages?.map((stage) => (
                                        <button
                                            key={stage}
                                            className={`${styles['stage']} ${currentStageFromPath === stage ? styles['active-stage'] : styles['inactive-stage']}`}
                                            onClick={() => handleStageChange(stage)}
                                        >
                                            Stage {stage}
                                        </button>
                                    ))}
                                </motion.div>
                            }
                        </AnimatePresence>
                    </div>
                ))
            }
        </div>
    )
}

export default Sidebar;