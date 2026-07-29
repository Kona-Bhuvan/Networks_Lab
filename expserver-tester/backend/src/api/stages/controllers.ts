import { Core } from '../../core/Core';
import { Request, Response } from '../../types';
import expressAsyncHandler from 'express-async-handler';
import { deleteFile, getFilePath, verifyStageNo } from '../../utils/file';
import { chmod } from 'fs';
import { FILE_EXECUTABLE_PERMS } from '../../constants';
import { FileModel } from '../../models/file.model';

const getStageDescription = expressAsyncHandler(async (req: Request, res: Response) => {
    const stageNo : string = req.params['num'] as string;

    const stageDescPath = Core.getDescription(stageNo);
    if (!stageDescPath) {
        res.status(404);
        throw new Error("Stage not found");
    }

    res.sendFile(getFilePath(`public/${stageDescPath}`));
})


/**
 * 
 */
const uploadBinaryHandler = expressAsyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400);
        throw new Error("File not found");
    }

    const stageNo : string = req.params['num'] as string;
    if (!verifyStageNo(stageNo)) {
        res.status(400);
        throw new Error("Stage not found");
    }

    const relativePath = req.file.path;
    const absolutePath = getFilePath(relativePath);
    const binaryId = relativePath.split('/').pop();
    const fileName = req.file.originalname;

    try {
        const stageNoInt = parseInt(stageNo);

        const existingFile = await FileModel.findOne({
            where: {
                stageNo: stageNoInt,
                userId: req.user,
            },
        });

        if (existingFile) {
            await deleteFile(existingFile.filePath); // delete from filesystem

            await FileModel.destroy({
                where: {
                    binaryId: existingFile.binaryId,
                },
            });
        }

        await FileModel.create({
            filePath: absolutePath,
            binaryId,
            fileName,
            stageNo: stageNoInt,
            userId: req.user,
        });
    } catch (error) {
        res.status(500);
        throw new Error("Error creating DB entry");
    }

    chmod(absolutePath, FILE_EXECUTABLE_PERMS, (err) => {
        if (err)
            return;
    })


    res.status(200).json({
        binaryId: fileName.split('/').pop(),
        stageNo,
    })
})

const deleteBinaryHandler = expressAsyncHandler(async (req: Request, res: Response) => {
    const stageNo : string = req.params['num'] as string;
    if (!verifyStageNo(stageNo)) {
        res.status(400);
        throw new Error("Stage not found");
    }

    try {
        const stageNoInt = parseInt(stageNo);

        const file = await FileModel.findOne({
            where: {
                stageNo: stageNoInt,
                userId: req.user,
            },
        });

        if (!file) {
            res.status(200).json({
                message: "already deleted",
            });
        } else {
            const filePath = file.filePath;

            await deleteFile(filePath); // delete from file system

            const runner = Core.runners.find(runner => (runner.stageNo.toString() == stageNo && runner.userId == req.user))
            if (runner)
                Core.deleteRunner(runner)

            await FileModel.destroy({
                where: {
                    binaryId: file.binaryId,
                },
            });

            res.status(200).json({
                message: "file deleted",
            });
        }
    } catch (error) {
        res.status(500);
        throw new Error("Something went wrong");
    }

    res.status(200).json({
        message: `Binary for Stage ${stageNo} deleted successfully.`,
    })
})


export {
    getStageDescription,
    uploadBinaryHandler,
    deleteBinaryHandler,
}