import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from '../types';

const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    let token: string;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        token = authHeader.split(' ')[1];
    }

    // else {
    //     token = randomUUID();
    // }

    req.user = token;
    next();
}

export default authMiddleware;  