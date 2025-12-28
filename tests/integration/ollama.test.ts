import { describe, expect, test, spyOn, afterAll } from "bun:test";
import { scoutNode } from "../../src/nodes";
import * as tools from "../../src/tools";
import { join } from "path";
import mockTavilyResults from "../fixtures/tavily_search_results.json";

describe("Ollama Integration (Scout Node)", () => {
  const TIMEOUT = 240000;
  const searchSpy = spyOn(tools, "searchJobsInDach").mockResolvedValue(mockTavilyResults);
  const outputFile = "tests/integration/ollama_test_result.md";

  afterAll(() => {
    searchSpy.mockRestore();
  });

  test("scoutNode should generate a cynical analysis using Ollama and write test_result.md", async () => {
    const resumePath = join(import.meta.dir, "../fixtures/resume_example.md");
    const resumeContent = await Bun.file(resumePath).text();

    const mockState = {
      messages: [],
      user_wishlist: "Senior Fullstack Engineer in Berlin",
      user_preferences: {
        role: "Senior Fullstack Engineer",
        keywords: ["React", "TypeScript", "Go"],
        location: "Berlin",
        country: "Germany",
        min_salary: 80000,
      },
      resume_content: resumeContent,
      output_file: outputFile
    };

    const result = await scoutNode(mockState);

    expect(result).toHaveProperty("messages");
    expect(result.messages.length).toBeGreaterThan(0);

    const aimessage = result.messages[0];
    const content = aimessage.content.toString();

    expect(content).toContain("Verdict:");
    expect(content).toMatch(/\[Verified Live\]|\[Search Snippet Only\]/);

    expect(searchSpy).toHaveBeenCalled();

    const file = Bun.file(outputFile);
    expect(await file.exists()).toBe(true);
  }, TIMEOUT);
});
