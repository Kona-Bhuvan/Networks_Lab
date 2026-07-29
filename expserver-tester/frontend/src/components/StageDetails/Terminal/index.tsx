import { useSocketContext } from '@/hooks/useSocketContext';
import styles from './terminal.module.css'
import { useEffect, useRef } from 'react';
import Convert from 'ansi-to-html';
import parseHtml from 'html-react-parser';


/**
 * 
 * @author Mayank Gupta
 */
const Terminal = () => {
    const { terminalData, stageNo } = useSocketContext()

    useEffect(() => {
        console.log(terminalData)
    }, [terminalData]);

    const converter = useRef<Convert>(new Convert({
        colors: {
            0: "#1e1e1e", // Black (background)
            1: "#ff5370", // Red
            2: "#c3e88d", // Green
            3: "#ffcb6b", // Yellow
            4: "#82aaff", // Blue
            5: "#c792ea", // Magenta
            6: "#89ddff", // Cyan
            7: "#ffffff", // White
            8: "#5c6370", // Bright Black (Gray)
            9: "#ff6e6e", // Bright Red
            10: "#c3e88d", // Bright Green
            11: "#ffcb6b", // Bright Yellow
            12: "#82aaff", // Bright Blue
            13: "#c792ea", // Bright Magenta
            14: "#89ddff", // Bright Cyan
            15: "#ffffff", // Bright White
        },
        newline: true, // Preserve newlines
        escapeXML: false, // Do not escape characters like <, >
        stream: true, // Enable proper handling of ANSI sequences
    }));

    return (
        <div className={styles['terminal']}>
            <div className={styles['terminal-heading']}>Stage {stageNo} &gt; </div>
            <div className={styles['terminal-container']}>
                {
                    terminalData.map((line, index) => (
                        <div key={index} className={styles['terminal-message']}>
                            {parseHtml(converter.current.toHtml(line))}
                        </div>
                    ))
                }
            </div>
        </div>
    )
};

export default Terminal