/**
 * reverses a string by keeping /n intact if exists at the end
 * @param input string
 * @returns reversed string
 */
export const reverseString = (input: string): string => {
    const len = input.length;
    if (input[len - 1] == '\n') {
        const arr = input.split('');
        const excludeNewLine = arr.slice(0, len - 1).reverse();

        return [...excludeNewLine, arr[len - 1]].join('');
    }
    return input.split('').reverse().join('');
}

/**
 * generates a random string
 * @param maxLength of the string
 * @returns random string of given length
 */
export const generateRandomStrings = (maxLength: number, count: number): string[] => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;

    let results = Array<string>(count);

    for (let i = 0; i < count; i++) {
        results[i] = '';
        const length = Math.floor(Math.random() * maxLength);
        for (let j = 0; j < length; j++) {
            results[i] += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        results[i] += '\n';
    }

    return results;
}