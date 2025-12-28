import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),

    user_wishlist: Annotation<string>({
        reducer: (_x, y) => y,
        default: () => "",
    }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user_preferences: Annotation<Record<string, any>>({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
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