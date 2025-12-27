# ReachOne: Onebox Email Aggregator

This project is a highly functional onebox email aggregator with advanced features. It synchronizes multiple IMAP email accounts in real-time and provides a seamless, searchable, and AI-powered experience.

## Features

1.  **Real-Time Email Synchronization:**
    *   Sync multiple IMAP accounts in real-time (minimum 2).
    *   Fetch at least the last 30 days of emails.
    *   Use persistent IMAP connections (IDLE mode) for real-time updates.

2.  **Searchable Storage:**
    *   Store emails in a locally hosted Elasticsearch instance (using Docker).
    *   Implement indexing to make emails searchable.
    *   Support filtering by folder & account.

3.  **AI-Based Email Categorization:**
    *   Implement an AI model to categorize emails into labels:
        *   Interested
        *   Meeting Booked
        *   Not Interested
        *   Spam
        *   Out of Office

4.  **Slack & Webhook Integration:**
    *   Send Slack notifications for every new "Interested" email.
    *   Trigger webhooks for external automation when an email is marked as "Interested".

5.  **AI-Powered Suggested Replies:**
    *   Store product and outreach agenda in a vector database.
    *   Use RAG (Retrieval-Augmented Generation) with an LLM to suggest replies.

### Frontend

*   A simple UI to display emails.
*   Filter emails by folder and account.
*   Show AI-powered categorization labels.
*   Basic email search functionality powered by Elasticsearch.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Runtime:** [Node.js](https://nodejs.org/)
*   **Database:** [Elasticsearch](https://www.elastic.co/) (for search), Vector Database (for AI replies)
*   **Deployment:** [Docker](https://www.docker.com/) for local services