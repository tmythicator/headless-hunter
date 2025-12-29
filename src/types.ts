export interface UserPreferences {
    role: string;
    keywords: string[];
    location: string;
    country?: string;
    min_salary: number | null;
    vibe?: string;
}

export interface TavilySearchResult {
    url: string;
    title: string;
    content?: string | null;
    raw_content?: string | null;
    score?: number;
    published_date?: string;
}
