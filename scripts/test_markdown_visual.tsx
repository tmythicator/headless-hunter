import { render } from 'ink';
import Report from '../src/components/Report';

const sample = `
# Markdown Visual Test

This script validates the **rendering capabilities** of the agent.

## Features to Check:

1. **Bold Text**: Should be bright and bold.
2. **Lists**: Should be indented.
3. **Links**:
- [Short Link](https://google.com)
- [Apply Here (Long URL)](https://www.linkedin.com/jobs/view/very-long-url-that-would-normally-break-wrapping-and-become-unclickable-in-some-terminals-123456789)
- **Link:** [Apply Here](https://www.linkedin.com/jobs/view/senior-software-engineer-%E2%80%93-go-golang-%24100-%E2%80%93-%24200-hr-remote-eu-at-call-for-referral-4291120813)
- **Badge Check:** ⚠️ [Tavily interpretation only]


---
*End of test.*
`;

render(<Report>{sample}</Report>);
