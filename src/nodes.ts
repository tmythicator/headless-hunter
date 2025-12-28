import { HumanMessage } from "@langchain/core/messages";
import { getModel } from "./model_factory";
import { AgentState } from "./state";
import { searchJobsInDach, extractUrlContent, harvestLinksFromPage, scrapeContentLocal } from "./tools";
import { logTrace } from "./logger";

export async function profilerNode(state: typeof AgentState.State) {
    const model = getModel('PLANNER');

    let resumeContent = "";
    try {
        resumeContent = await Bun.file("resume.md").text();
    } catch (e) {
        console.warn("Resume not found or unreadable.", e);
    }

    const prompt = `
  You are an expert Technical Recruiter.

  User Wish: "${state.user_wishlist}"
  User Resume:
  ${resumeContent}

  TASK:
  1. Analyze both the Wish and the Resume.
  2. Extract search criteria as JSON.

  Return strictly JSON:
  {
    "role": "Job Title (e.g. Fullstack Engineer)",
    "keywords": ["Tech1", "Tech2", "Go", "TypeScript"],
    "location": "City/Region",
    "country": "Country Name",
    "min_salary": number | null,
    "vibe": "Startup/Corp/etc"
  }
  RETURN JSON ONLY. No markdown formatting.
  `;

    const response = await model.invoke([new HumanMessage(prompt)]);

    await logTrace("PROFILER", prompt, response.content.toString());

    const cleanJson = response.content.toString().replace(/```json|```/g, '').trim();

    let prefs;
    try {
        prefs = JSON.parse(cleanJson);
    } catch (_e) {
        await logTrace("PROFILER_ERROR", "JSON Parse Error", cleanJson);
        prefs = { role: state.user_wishlist, keywords: [], location: "", min_salary: null };
    }

    return {
        user_preferences: prefs,
        resume_content: resumeContent,
        messages: [new HumanMessage(`Strategy: Hunting for ${prefs.role} in ${prefs.location}`)]
    };
}

export async function scoutNode(state: typeof AgentState.State) {
    const model = getModel('WORKER');
    const p = state.user_preferences;
    const resume = state.resume_content;

    const baseQuery = `${p.role} ${p.keywords.slice(0, 3).join(" ")} ${p.location} ${p.country || ""}`;
    const siteConstraints = [
        "site:linkedin.com/jobs/view/",
        "site:glassdoor.com/job-listing/",
        "site:boards.greenhouse.io",
        "site:jobs.lever.co",
        "site:apply.workable.com",
        "site:personio.de",
        "site:join.com",
        "site:wellfound.com"
    ].join(" OR ");

    const query = `${baseQuery} (${siteConstraints}) "apply" -inurl:search -inurl:SRCH -inurl:jobs-at`;

    // 2. Initial Search
    const searchResults = await searchJobsInDach(query, {
        max_results: 25,
        search_depth: "advanced"
    });
    const searchResultsString = typeof searchResults === 'string' ? searchResults : JSON.stringify(searchResults, null, 2);
    await logTrace("SCOUT_SEARCH", query, searchResultsString);

    // 3. Collect verified links
    const verifiedLinksMap = new Map<string, string>();
    if (Array.isArray(searchResults)) {
        searchResults.forEach(r => {
            if (r.url) verifiedLinksMap.set(r.url, r.title || "No Title");
        });
    }

    // Harvester (Local Puppeteer)
    const harvestTargets = Array.isArray(searchResults)
      ? searchResults.filter(r =>
          r.url && (
            r.url.includes("glassdoor") ||
            r.url.includes("linkedin.com/jobs/search") ||
            r.url.includes("stepstone") ||
            r.url.includes("indeed") ||
            (r.title && r.title.toLowerCase().includes("jobs") && !r.url.includes("/view/") && !r.url.includes("/job/"))
          )
        ).slice(0, 2)
      : [];

    let scrapedKnowledge = "";

    // Harvest locally
    const successfulScrapes = new Set<string>();

    if (harvestTargets.length > 0) {
        for (const target of harvestTargets) {
            const harvestedJobs = await harvestLinksFromPage(target.url);
            if (harvestedJobs.length > 0) {

                // Add harvested links to verified map
                harvestedJobs.forEach(job => verifiedLinksMap.set(job.url, `Harvested: ${job.title}`));

                // Scrape content locally (Saving Tavily Quota)
                // Only scrape the first 3 harvested links per list to save time/bandwidth
                const bestJobs = harvestedJobs.slice(0, 3);

                for (const job of bestJobs) {
                    const content = await scrapeContentLocal(job.url);
                    if (content.length > 100) {
                        scrapedKnowledge += `\n\n--- HARVESTED JOB SOURCE: ${job.url} (${job.title}) ---\n${content}\n`;
                        successfulScrapes.add(job.url);
                    }
                }
            }
        }
    }

    if (scrapedKnowledge.length < 500) {
       const directLinks = Array.isArray(searchResults)
           ? searchResults.filter(r => !r.url.includes("glassdoor") && !r.url.includes("search")).slice(0, 2).map(r => r.url)
           : [];

       if (directLinks.length > 0) {
           const scrapedDocs = await extractUrlContent(directLinks);
           scrapedDocs.forEach((d: { url: string, raw_content?: string, content?: string }) => {
               const txt = d.raw_content || d.content || "";
               scrapedKnowledge += `\n\n--- TAVILY SOURCE: ${d.url} ---\n${txt}`;
               if (txt.length > 100) successfulScrapes.add(d.url);
            });
       }
    }

    const verifiedLinksLibrary = Array.from(verifiedLinksMap.entries()).map(([url, title]) => {
        return `- ${title}: ${url}`;
    }).join("\n");

    const verifiedScrapesList = Array.from(successfulScrapes).join("\n");

    const analysisPrompt = `
    You are "Headless Hunter", a cynical, battle-hardened technical recruiter.
    You have NO patience for corporate fluff. Your job is to find the TRUTH about job openings.

    USER PROFILE:
    - Role: ${p.role}
    - Stack: ${p.keywords.join(", ")}
    - Local Resume Context: ${resume.substring(0, 1000)}...

    VERIFIED SCAN DATA (TOTAL TRUST ZONE):
    ${searchResultsString}

    SCRAPED CONTENT (HIGH TRUST - DEEP DIVES):
    ${scrapedKnowledge || "No detailed scraping available."}

    VERIFIED LINK LIBRARY:
    ${verifiedLinksLibrary || "NO VERIFIED LINKS FOUND"}

    SUCCESSFULLY SCRAPED URLs (LIVE VERIFIED):
    ${verifiedScrapesList || "NONE"}

    TASK:
    Analyze the market. Pick up to 10 best fits. Be thorough, be honest, be cynical.

    MANDATORY RULES:
    1. **STRICT GROUNDING**: ONLY report jobs that were explicitly found in the SCAN DATA or SCRAPED CONTENT.
    2. **PRIORITIZE DEPTH**: Jobs listed in SCRAPED CONTENT have full descriptions. USE THEM. They are better matches than generic search snippets.
    3. **STRICT TECH LOCK**: If a job is Java-only or PHP-only and the user wants React/Go, ROAST it and don't include it.
    4. **NO HALLUCINATIONS**: Do NOT invent URLs. Use ONLY links from the VERIFIED LINK LIBRARY.
    5. **NO AGGREGATORS**: Skip results that are just "7,000+ jobs" lists or generic search pages. Focus on individual company postings.
    6. **DEPTH**: For each job, provide a detailed breakdown of the stack mentioned in the snippets vs the user's stack. Mention specific libraries if visible.
    7. **VERIFICATION BADGE**: Check if the Job URL is in the "SUCCESSFULLY SCRAPED URLs" list.
       - If YES: Add "✅ [Verified Live]" to the Verdict.
       - If NO: Add "⚠️ [Search Snippet Only]" to the Verdict.

    REPORT FORMAT (Markdown):
    ## [Job Title] @ [Company] ([Country - e.g. Germany])
    * **Verdict:** [Strong Match / Weak Match / Interesting Gamble] - [BADGE HERE]
    * **Verified Stack:** List specific tools found in the description (e.g. "React, Typescript, AWS" - NOT generic "Frontend").
    * **Cynical Take:** What's the catch? Legacy code? Vague description? Too many buzzwords?
    * **Why it fits:** Direct mapping to user's profile.
    * **Link:** [Apply Here](URL_FROM_LIBRARY)

    ---
    **Market Summary:** A 1-sentence honest (cynical) assessment of the market today.
    `;

    const response = await model.invoke([new HumanMessage(analysisPrompt)]);
    const analysisText = response.content.toString();
    await logTrace("SCOUT_ANALYSIS", analysisPrompt, analysisText);

    // Write result
    try {
        const outFile = state.output_file || "result.md";
        await Bun.write(outFile, analysisText);
    } catch (e) {
        await logTrace("SCOUT_ERROR", "Failed to write result.md", String(e));
    }

    return { messages: [response] };
}