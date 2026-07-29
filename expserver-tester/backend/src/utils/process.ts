import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { chmod, promises } from "fs";
import { FILE_EXECUTABLE_PERMS } from "../constants";
import { parse } from "path";
export const createSpawn = async (filePath: string): Promise<ChildProcessWithoutNullStreams> => {
    return new Promise((resolve, reject) => {
        chmod(filePath, FILE_EXECUTABLE_PERMS, (err) => {
            if (err)
                return reject(err);
            const child = spawn(filePath);
            child.on('spawn', () => {
                return resolve(child);
            })
        })

    })
}

export const deleteSpawn = (spawnInstance: ChildProcessWithoutNullStreams): void => {
    if (spawnInstance.killed)
        return;

    spawnInstance.kill("SIGINT");
}

export const getCpuUsage = async (pid: number): Promise<number> => {
    const statFile = `/proc/${pid}/stat`;
    const cpuStatFile = '/proc/stat';

    try {
        const processStat = await promises.readFile(statFile, 'utf8');
        const cpuStat = await promises.readFile(cpuStatFile, 'utf8');

        const processFields = processStat.split(' ');

        const utime = parseInt(processFields[13], 10);
        const stime = parseInt(processFields[14], 10);
        const startTime = parseInt(processFields[21], 10);

        const processCpuTime = utime + stime;
        const cpuTimes = cpuStat.split('\n')[0].split(' ').filter(Boolean);
        const totalCpuTime = cpuTimes.slice(1, 8).reduce((acc, time) => acc + parseInt(time, 10), 0);
        const cpuUsage = ((processCpuTime / startTime) * 100).toFixed(2);


        return parseFloat(cpuUsage);
    }
    catch (error) {
        console.error(error);
        return -1;
    }
}

export const getMemUsage = async (pid: number): Promise<number> => {
    // const statusFile = `/proc/${pid}/status`;

    // try {
    //     const status = await promises.readFile(statusFile, 'utf8');

    //     const memoryStats = {};

    //     // Extract relevant memory info (VmSize, VmRSS, VmData, etc.)
    //     const vmSizeMatch = status.match(/VmSize:\s+(\d+)\s+kB/); // Virtual memory size
    //     const vmRSSMatch = status.match(/VmRSS:\s+(\d+)\s+kB/);   // Resident set size
    //     const vmDataMatch = status.match(/VmData:\s+(\d+)\s+kB/); // Data size (heap)
    //     const vmExeMatch = status.match(/VmExe:\s+(\d+)\s+kB/);   // Executable code size
    //     const vmStkMatch = status.match(/VmStk:\s+(\d+)\s+kB/);   // Stack size
    //     const vmShrMatch = status.match(/RssShmem:\s+(\d+)\s+kB/); // Shared memory (RSS)

    //     // Convert values from kB to bytes and store them in the object
    //     if (vmSizeMatch) memoryStats.vmSize = parseInt(vmSizeMatch[1], 10) * 1024; // in bytes
    //     if (vmRSSMatch) memoryStats.vmRSS = parseInt(vmRSSMatch[1], 10) * 1024;   // in bytes
    //     if (vmDataMatch) memoryStats.vmData = parseInt(vmDataMatch[1], 10) * 1024; // in bytes
    //     if (vmExeMatch) memoryStats.vmExe = parseInt(vmExeMatch[1], 10) * 1024;   // in bytes
    //     if (vmStkMatch) memoryStats.vmStk = parseInt(vmStkMatch[1], 10) * 1024;   // in bytes
    //     if (vmShrMatch) memoryStats.vmShr = parseInt(vmShrMatch[1], 10) * 1024;   // in bytes

    //     return memoryStats;

    // } catch (err) {
    //     console.error(`Error reading memory usage for PID ${pid}:`, err);
    //     return null;
    // }

    return 0;
}