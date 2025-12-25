import { harvestLinksFromPage } from "./tools";

const TEST_CASES = [
    {
        name: "Glassdoor List Page (Working)",
        url: "https://www.glassdoor.de/Job/karlsruhe-baden-w%C3%BCrttemberg-deutschland-senior-software-engineer-jobs-SRCH_IL.0,39_IC2771206_KO40,64.htm"
    },
    {
        name: "Glassdoor Individual Listing 1 (Glass Lewis)",
        url: "https://www.glassdoor.com/job-listing/senior-ui-software-engineer-glass-lewis-and-co-JV_IC2363570_KO0,27_KE28,46.htm?jl=1009947579765"
    },
    {
        name: "Glassdoor Individual Listing 2 (Scalable Press)",
        url: "https://www.glassdoor.com/job-listing/senior-fullstack-engineer-typescript-client-success-platform-m-f-x-onsite-remote-in-germany-scalable-press-JV_IC2622109_KO0,91_KE92,106.htm?jl=1009885368868"
    }
];

async function runTestBench() {
    console.log("[TestBench] Starting Harvester Test Bench...");
    console.log("=====================================");

    for (const test of TEST_CASES) {
        console.log(`\n[Test] Testing: ${test.name}`);
        console.log(`   URL: ${test.url}`);
        
        try {
            const start = performance.now();
            const links = await harvestLinksFromPage(test.url);
            const duration = (performance.now() - start).toFixed(0);

            if (links.length > 0) {
                console.log(`   [SUCCESS] Harvested ${links.length} links in ${duration}ms`);
                console.log(`   Sample Job 1: "${links[0].title}"\n   Link: ${links[0].url}`);
                
                // Content Extraction Verification
                console.log(`   [Verify] Content Extraction for: ${links[0].url}`);
                const { scrapeContentLocal } = await import("./tools");
                const content = await scrapeContentLocal(links[0].url);
                console.log(`   [Verify] Extracted ${content.length} chars.`);
                
                // Write to file for full inspection
                const fs = await import("fs");
                await fs.promises.writeFile("glassdoor_content_debug.txt", content);
                console.log(`   [Verify] Full content saved to: glassdoor_content_debug.txt`);
                
                console.log(`   [Verify] Snippet: "${content.substring(0, 300).replace(/\n/g, ' ')}..."`);

            } else {
                console.error(`   [FAIL] Harvested 0 links.`);
            }
        } catch (e) {
            console.error(`   [ERROR] Exception during harvest.`, e);
        }
    }
    
    console.log("\n=====================================");
    console.log("[TestBench] Complete.");
}

runTestBench().catch(console.error);
