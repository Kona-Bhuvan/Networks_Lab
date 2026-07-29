import axios from 'axios';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const getToken = async () => {
    try {
        const response = await axios.get<{ token: string }>(`${BACKEND_URL}/token`);
        return response.data.token;
    }
    catch {
        return null;
    }
}

export const getStageDescription = async (stageNo: number, token: string) => {
    if (stageNo < 1 || !token)
        return;
    try {
        const response = await axios.get(`${BACKEND_URL}/stage/${stageNo}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        });
        return response.data;
    }
    catch (error) {
        return null;
    }
}

export const uploadBinary = async (stageNo: number, token: string, file: File) => {
    if (stageNo < 1 || !token)
        return;
    const formData = new FormData();
    formData.append('binary', file);

    try {
        const response = await axios.post<{ binaryId: string, stageNo: number }>(
            `${BACKEND_URL}/stage/${stageNo}/binary`,
            formData,
            {
                headers: {
                    "Content-Type": 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                }
            }
        )
        return response.data.binaryId;
    }
    catch {
        return null;
    }
}

export const deleteBinary = async (stageNo: number, token: string) => {
    if (!token)
        return;
    try {
        await axios.delete(
            `${BACKEND_URL}/stage/${stageNo}/binary`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        )

        return true;
    }
    catch {
        return false;
    }
}