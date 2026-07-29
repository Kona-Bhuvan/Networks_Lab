import { useEffect, useState, useRef } from "react";
import styles from "./ramGraph.module.css"
import { style } from "framer-motion/client";

interface Point{
    x: number;
    y: number;
}

interface LiveLineGraphProps{
    width: number;
    height: number;
    xStep?: number;
}

interface RamGraphProps{
    value: number;
}

const RamGraph: React.FC<RamGraphProps> = ({value}) => {
    const [points, setPoints] = useState<Point[]>([]);
    const currentX = useRef(0);
    const [ramValue, setRamValue] = useState<number>(0);

    useEffect(()=>{
        addPoint(value)
    },[value]);

    // mock graph simulation
    // useEffect(() => {
    //     let count = 0;
    //     const interval = setInterval(() => {
    //       if (count >= 50) {
    //         clearInterval(interval);
    //         return;
    //       }
      
    //       const randomY = Math.floor(Math.random() * 100);
    //       setRamValue(randomY);
    //       addPoint(randomY);
    //       count++;
    //     }, 200);
      
    //     return () => clearInterval(interval);
    //   }, []);

    // const addPoint = (yYalue: number) => {
    //     const scaledY = (1 - yYalue/100)*150; // height of the container is 150px;
    //     const newPoint: Point = {x: currentX.current, y: scaledY};
    //     const updatedPoints = [... points, newPoint];

    //     currentX.current += 10; // xStep

    //     // shift left if overflowing
    //     if(currentX.current > 200){ // 200 is the width of graph container
    //         for(let p of updatedPoints) p.x -= 10;
    //         currentX.current -= 10;
    //     }

    //     // keep only visible points
    //     const visiblePoints = updatedPoints.filter(p => p.x >= 0);
    //     setPoints(visiblePoints);
    // }

    const addPoint = (yValue: number) => {
        setPoints(prevPoints => {
          const scaledY = (1 - yValue / 100) * 150;
          const newX = currentX.current;
      
          currentX.current += 10;
      
          let updatedPoints = [...prevPoints, { x: newX, y: scaledY }];
      
          // Shift left if overflowing
          if (newX > 200) {
            updatedPoints = updatedPoints.map(p => ({ ...p, x: p.x - 10 }));
            currentX.current -= 10;
          }
      
          // Filter visible points
          return updatedPoints.filter(p => p.x >= 0);
        });
      };
      
    return (
        <div className={styles['ram-graph']}>
            <div className={styles['ram-graph-vartical-values']}>
                <div className={styles['scale-values']}></div>
                <div className={styles['scale-values']}>75</div>
                <div className={styles['scale-values']}>50</div>
                <div className={styles['scale-values']}>25</div>
            </div>
            <div className={styles['ram-graph-vertical-scale']}>
                <div className={styles['scale']}>
                    {/* <div className={'scale-value'}>100</div> */}
                </div>
                <div className={styles['scale']}>
                    {/* <div className={'scale-value'}>75</div> */}
                </div>
                <div className={styles['scale']}>
                    {/* <div className={'scale-value'}>50</div> */}
                </div>
                <div className={styles['scale']}>
                    {/* <div className={'scale-value'}>25</div> */}
                </div>
            </div>
            <div className={styles['ram-graph-container']}>
                <svg width='100%' height='100%'>
                    <polyline
                        fill="none"
                        stroke="#35BF53"
                        strokeWidth="2"
                        points={points.map(p=> `${p.x}, ${p.y}`).join(" ")}
                    />
                </svg>

                <div className={styles['ram-usage-display']}>
                    {value}%
                </div>
            </div>
        </div>
    );
};

export default RamGraph;