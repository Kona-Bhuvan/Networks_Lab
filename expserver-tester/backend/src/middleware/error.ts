import { NextFunction, Request, Response } from "../types";

import { ErrorTypes } from '../constants';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = res.statusCode ? res.statusCode : 500;
    switch (statusCode) {
        case ErrorTypes.VALIDATION_ERROR:
            res.json({
                title: "Validation Error",
                message: err.message,
                // stackTrace: err.stack
            })
            break;

        case ErrorTypes.UNAUTHORIZED:
            res.json({
                title: "Unathorized",
                message: err.message,
                // stackTrace: err.stack
            })
            break;

        case ErrorTypes.FORBIDDEN:
            res.json({
                title: "Forbidden",
                message: err.message,
                // stackTrace: err.stack
            })
            break;

        case ErrorTypes.NOT_FOUND:
            res.json({
                title: "Not Found",
                message: err.message,
                // stackTrace: err.stack
            })
            break;

        case ErrorTypes.SERVER_ERROR:
            res.json({
                title: "Server Error",
                message: err.message,
                // stackTrace: err.stack
            })
            break;

        default:
            break;
    }
};