import { stageTests } from "./tests/stages";
import fs from 'fs'
import path from 'path'
import { type Test } from "./types";
import { json } from "stream/consumers";

const WORKDIR = process.cwd();


const getTestData = (stageName: string): Omit<Test, 'status'>[] => {
    return stageTests[stageName];
}


const generateDescriptions = (stageName: string) => {
    const markdownFileName = `${stageName}.md`
    const markdownFilePath = path.join(WORKDIR, 'public', 'description', markdownFileName);
    try {
        const existingData = fs.readFileSync(markdownFilePath, 'utf8');
        const metadata = existingData.toString().split("## Tests")[0].trim();

        const tests = getTestData(stageName);

        let testData = "\n\n## Tests\n";
        tests.map((test, index) => {
            testData += `### Test ${index + 1}: ${test.title}
${test.description}\n
\`\`\`js
testInput: "${test.testInput}"
expectedBehavior: "${test.expectedBehavior}"
\`\`\`\n
`;
        });

        fs.writeFileSync(markdownFilePath, metadata + testData, 'utf8');
    }
    catch (error) {
        console.error("Error", error);
        console.log("skipping " + stageName);
        return;
    }


}

Object.keys(stageTests).map(generateDescriptions);