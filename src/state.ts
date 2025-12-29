import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { UserPreferences } from "./types";

export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),

    user_wishlist: Annotation<string>({
        reducer: (_x, y) => y,
        default: () => "",
    }),

    user_preferences: Annotation<UserPreferences>({
        reducer: (x, y) => ({ ...x, ...y } as UserPreferences), 
        default: () => ({ role: "", keywords: [], location: "", min_salary: null } as UserPreferences),
    }),

    resume_content: Annotation<string>({
        reducer: (_x, y) => y,
        default: () => "",
    }),

    output_file: Annotation<string>({
        reducer: (_x, y) => y,
        default: () => "result.md",
    }),
});