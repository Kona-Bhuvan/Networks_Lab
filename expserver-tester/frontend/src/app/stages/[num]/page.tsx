"use client";

import Execute from "@/components/Execute";
import Loading from "@/components/Loading";
import { useSocketContext } from "@/hooks/useSocketContext";
import { notFound, useParams } from "next/navigation";
import { useEffect } from "react";
import styles from './styles.module.css';
import StageDetails from "@/components/StageDetails";
import { AnimatePresence } from "framer-motion";

const Page = () => {
  const { updateStage, loading, initializeSocket } = useSocketContext();
  const params = useParams();
  const pageNum = (params['num'] as string);

  useEffect(() => {
    const stageNo = parseInt(pageNum);
    if (isNaN(stageNo))
      notFound();
    const asyncFn = async () => {
      await initializeSocket();
      updateStage(stageNo);
    }

    void asyncFn();
  }, [pageNum, initializeSocket, updateStage]);

  return (
    <div className="h-[calc(100vh-50px)] w-[calc(100dvw-300px)]">
      <AnimatePresence>
        {
          loading &&
          <Loading />
        }
      </AnimatePresence>

      <div className={styles.testboard}>
        <StageDetails />
        <Execute />
      </div>
    </div>
  );
}

export default Page;