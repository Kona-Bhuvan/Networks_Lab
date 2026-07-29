import { randomUUID } from "crypto";
import { Request, Response } from "../../types";

const getTokenHandler = (req: Request, res: Response) => {
    if (req.user) {
        res.status(200).json({
            token: req.user,
        })
    }

    const newToken = randomUUID();
    res.status(200).json({
        token: newToken,
    });
}

export {
    getTokenHandler,
}