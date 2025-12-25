export async function logTrace(stage: string, input: string, output: string) {
    const timestamp = new Date().toISOString();
    const entry = `\n--- [${timestamp}] ${stage} ---\nIN:\n${input}\n\nOUT:\n${output}\n---------------------------\n`;
    try {
        const fileContent = await (async () => {
            try {
                return await Bun.file("trace.log").text();
            } catch {
                return "";
            }
        })();
        await Bun.write("trace.log", fileContent + entry);
    } catch (e) {
        console.error("Tracing failed:", e);
    }
}
