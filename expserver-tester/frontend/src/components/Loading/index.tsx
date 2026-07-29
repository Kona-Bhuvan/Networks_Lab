import { motion } from "framer-motion";
import Image from "next/image";
import { PuffLoader } from "react-spinners";

/**
 * Loading component
 */
const Loading = () => {
    return (
        <motion.div
            className="fixed top-0 z-[100] left-0 h-screen w-screen bg-white text-black flex items-center justify-center gap-4"
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: 1,
            }}
            exit={{
                opacity: 0,
            }}
        >
            <Image src="/logo.svg" alt="loading-logo" width={200} height={200} />
            <PuffLoader
                loading={true}
                size={40}
                color="#2B4ED5"
            />
        </motion.div>
    )
}

export default Loading;