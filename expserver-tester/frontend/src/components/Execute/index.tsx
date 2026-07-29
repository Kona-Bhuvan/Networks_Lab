'use client'
import { useState, useEffect, useMemo, FC, useCallback, ChangeEventHandler, MouseEventHandler } from 'react'
import styles from './execute.module.css'
import { deleteBinary, getToken, uploadBinary } from '@/lib/rest'
import { useSocketContext } from '@/hooks/useSocketContext'
import Image from 'next/image'
import add from '/public/add.svg'
import play from '/public/play.svg'
import info from '/public/info.svg'
import stop from '/public/stop.svg'
import bin from '/public/delete.svg'
import TestContainer from '../TestContainer'
import ResourceMonitor from '../ResourceMonitor'
import { TestStatus } from '@/types'

/**
 * Execute component for managing binary file uploads, execution, and monitoring.
 *
 * This component allows users to upload a binary file, delete it, and execute tests.
 * It also provides real-time status updates and resource monitoring.
 *
 */
const Execute: FC = () => {
    const {
        stageNo,
        userId,
        status,
        fileName,
        binaryId,
        updateBinaryId,
        runTests,
        stopTests,
        resetResults
    } = useSocketContext();
    const [file, setFile] = useState<File | null>(null);
    const [myFile, setMyFile] = useState<string>(fileName || "Choose a file");


    useEffect(() => {
        setMyFile(fileName || "Choose a file")
    }, [fileName])


    const disableRunButton = useMemo(() => {
        return (status == 'running' || binaryId == null);
    }, [status, binaryId]);

    const isFileUploaded = useMemo(() => {
        return (!!binaryId);
    }, [binaryId]);


    const handleUploadFile = useCallback(async () => {
        if (file == null) {
            return;
        }
        const response = await uploadBinary(stageNo, userId, file);
        updateBinaryId(response);
        resetResults();
    }, [file, stageNo, userId, updateBinaryId, resetResults]);

    const handleDeleteFile = useCallback(async () => {
        const response = await deleteBinary(stageNo, userId);
        if (response == true) {
            updateBinaryId(null);
            setFile(null);
            setMyFile('Choose a file')
        }
        else {
            console.log(Error, "failed to delete the binary")
        }
    }, [stageNo, userId, updateBinaryId]);

    const handleFileChange: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
            setMyFile(event.target.files[0].name);
        }
    }, []);


    const handleButtonClick: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
        if (status == TestStatus.Running)
            stopTests();
        else
            runTests();
    }, [status, stopTests, runTests]);

    const handleInfoClick = useCallback(() => {
        alert('Information about binary file here');
    }, []);

    return (
        <div className={styles.execute}>
            <div className={styles['execute-heading']}>Execute</div>
            <div className={styles['upload-container']}>
                <div className={styles['upload-heading']}>Binary File <Image src={info} alt='info' height={16} width={16} onClick={handleInfoClick} className={styles['info']} /></div>
                <div className={styles['upload-inner-container']}>
                    <div className={styles['upload-file-container']}>
                        <input type="file" placeholder="select a file" className={styles['file-input']} id="file-input" onChange={handleFileChange} />
                        <label htmlFor={isFileUploaded ? 'none' : 'file-input'} className={styles['custom-file-input']}>
                            <Image src={add} alt='add-img' height={20} width={20} draggable={false} />
                            Add
                        </label>
                        <input className={styles['add-file-input']} type='text' disabled value={myFile} />
                        {
                            binaryId && (
                                <div className={styles.bin}>
                                    <Image src={bin} alt='bin' height={25} width={25} onClick={handleDeleteFile} />
                                </div>
                            )
                        }
                    </div>
                    {
                        isFileUploaded ? (
                            <button
                                className={`${styles['execute-button']} ${styles['execute-run']}`}
                                onClick={handleButtonClick}
                                disabled={disableRunButton}
                            >
                                {
                                    status == 'running'
                                        ? <span className={styles['execute-active-run']}><Image src={stop} alt='stop' height={20} width={20} draggable={false} />Stop</span>
                                        : <span className={styles['execute-active-run']}><Image src={play} alt='run' height={20} width={20} draggable={false} />Run</span>
                                }
                            </button>
                        ) : (
                            <button
                                className={`${styles['execute-button']} ${styles['execute-upload']}`}
                                onClick={handleUploadFile}
                            >
                                <span>Upload</span>
                            </button>
                        )
                    }
                </div>
            </div>
            {
                isFileUploaded &&
                <ResourceMonitor />
            }
            {/* {
                isFileUploaded ? <ResourceMonitor/> : 
                <div className={styles['idle-container']}>
                    <div className={styles['test-container-idle']}> Upload a binary file to test</div>
                </div>
            } */}
            <TestContainer />
        </div>
    )
}

export default Execute;