import { useSocketContext } from '@/hooks/useSocketContext';
import styles from './resourceMonitor.module.css'
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import update from '/public/update.svg'
import Speedometer from './Speedometer';
import CpuDial from '../CpuDial';
import { s } from 'framer-motion/client';
import RamGraph from '../RamGraph';



const ResourceMonitor = () => {
    const { status, resourceMetrics, timer } = useSocketContext();
    const [isRunning, setIsRunning] = useState<boolean>(true);

    useEffect(() => {
        if (status == 'running') {
            setIsRunning(true);
        }
        else {
            setIsRunning(false);
        }
    }, [status]);


    const timerDetails = useMemo(() => {
        const mins = timer == -1
            ? -1
            : Math.floor(timer / 60)

        const secs = timer == -1
            ? -1
            : (timer % 60)

        const minsString = mins == -1
            ? "--"
            : mins < 10
                ? `0${mins}`
                : mins
            ;

        const secsString = secs == -1
            ? "--"
            : secs < 10
                ? `0${secs}`
                : secs
            ;
        return {
            mins: minsString,
            secs: secsString,
        }
    }, [timer]);

    return (
        <div className={styles['resource-monitor']}>
            <div className={styles['execution-status-container']}>
                <div>
                    {isRunning &&
                        <div className={styles['execution-status']}>
                            <Image src={update} alt='update' width={20} height={20} draggable={false} className={styles['running-img']} />
                            <div>Running</div>
                        </div>
                    }
                </div>

                <div className={styles['time-elapsed-container']}>
                    <div className={styles['time-elapsed-heading']}>Time elapsed</div>
                    <div className={styles['time-elapsed-timer']}>{timerDetails.mins}:{timerDetails.secs}</div>
                </div>
            </div>
            <div className={styles['resource-monitor-container']}>
                {/* <div className={styles['resource-monitor-elements']}>
                    <Speedometer value={resourceMetrics?.cpu || 0} label="CPU Usage" />
                </div> */}
                {/* <div className={styles['resource-monitor-elements']}>
                    <Speedometer value={resourceMetrics?.mem || 0} label="Memory Usage" />
                </div> */}
                <div className={styles['resource-plot-container']}>
                    <div className={styles['resource-monitor-head']}> CPU Usage</div>
                    <div className={styles['resource-cpu-dial-container']}>
                        <CpuDial value={resourceMetrics?.cpu || 0}/>
                    </div>
                </div>
                <div className={styles['resource-plot-container']}>

                    {/* <CpuDial/> */}
                    <div className={styles['resource-monitor-head']}> RAM Usage</div>
                        <div className={styles['resource-ram-usage-container']}>
                            <RamGraph value={resourceMetrics?.mem || 0}/>
                        </div>
                </div>
            </div>
        </div>
    )
}

export default ResourceMonitor;