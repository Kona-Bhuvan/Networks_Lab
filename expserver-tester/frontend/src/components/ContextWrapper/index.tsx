"use client";

import { SocketContextProvider } from "@/hooks/Context";
import { FC, ReactNode } from "react";


export interface ContextWrapperProps {
    children: ReactNode,
}

/**
 * ContextWrapper component that provides a socket connection context  
 * to its children using `SocketContextProvider`.  
 *
 * This component should wrap parts of the application that  
 * need access to the socket context.
 *
 */
const ContextWrapper: FC<ContextWrapperProps> = ({
    children
}) => {
    return (
        <SocketContextProvider>
            {children}
        </SocketContextProvider>
    )
}

export default ContextWrapper;