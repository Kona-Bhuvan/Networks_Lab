export const bestFitLine = (points: number[]) => {
    const n = points.length;
    if (n == 0)
        return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let x = 0; x < n; x++) {
        const y = points[x];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}