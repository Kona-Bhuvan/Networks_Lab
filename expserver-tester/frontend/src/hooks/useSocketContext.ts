import { useContext } from "react";
import { SocketContext } from "./Context"

export const useSocketContext = () => {
    const context = useContext(SocketContext);
    if (!context)
        throw new Error('useSocketContext must be used within an SocketContextProvider')
    return context;
}