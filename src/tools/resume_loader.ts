import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const pdf = require('pdf-parse');

const DATA_DIR = 'data';

export async function listResumes(): Promise<string[]> {
  try {
    if (!(await Bun.file(DATA_DIR).exists()) && !fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
      return [];
    }

    const files = fs.readdirSync(DATA_DIR);
    return files
      .filter((f) => f.endsWith('.pdf') || f.endsWith('.md'))
      .map((f) => `${DATA_DIR}/${f}`);
  } catch (e) {
    console.error('Failed to list resumes', e);
    return [];
  }
}

export async function loadResume(specificPath?: string | null): Promise<string> {
  if (specificPath) {
    try {
      if (specificPath.endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(specificPath);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const instance = new pdf.PDFParse(new Uint8Array(dataBuffer));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const data = await instance.getText();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        return data.text;
      } else {
        return await Bun.file(specificPath).text();
      }
    } catch (e) {
      console.warn(`Failed to load selected resume '${specificPath}'.`, e);
      return '';
    }
  }

  console.info('⚠️ No resume selected.');
  return '';
}
