import { Router } from 'express';
import multer from 'multer';
import { getStageDescription, uploadBinaryHandler, deleteBinaryHandler } from './controllers';


const router = Router();
const upload = multer({ dest: 'uploads' });

router.get('/:num', getStageDescription);

router.route('/:num/binary')
    .post(upload.single('binary'), uploadBinaryHandler)
    .delete(deleteBinaryHandler)


export default router;