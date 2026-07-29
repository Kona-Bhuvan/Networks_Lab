import moment from "moment";
import { NextFunction, Request, Response } from "../types";

const logger = (req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${req.method}] ${req.originalUrl}: (${moment()})`);
    next();
};

export default logger;