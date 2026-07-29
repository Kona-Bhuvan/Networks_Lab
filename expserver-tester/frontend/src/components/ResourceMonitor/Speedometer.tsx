import SpeedometerComponent, { Arc, Background, Indicator, Marks, Needle, Progress } from 'react-speedometer/dist';
import styles from './speedometer.module.css'


const Speedometer = ({
    value,
    label
}) => {
    return (
        <div className={styles['speedometer']}>
            <SpeedometerComponent
                accentColor='black'
                value={value}
                max={100}
                angle={180}
                fontFamily='squada-one'
                width={200}
            >
                <Background angle={180} />
                <Arc />
                <Needle />
                <Progress />
                <Marks />
                <Indicator />
            </SpeedometerComponent>

            <span className={styles.label}>
                {label}
            </span>
        </div>
    )
}

export default Speedometer;