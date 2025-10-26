# Reach-One: Onebox Email Aggregator

This project is a highly functional onebox email aggregator with advanced features, similar to Reachinbox. It synchronizes multiple IMAP email accounts in real-time and provides a seamless, searchable, and AI-powered experience.

## Problem Statement

The goal is to build a backend and frontend system that synchronizes multiple IMAP email accounts in real-time, stores them for fast searching, categorizes them using AI, and provides a user interface to view and interact with the emails.

## Features

### Backend

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

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.