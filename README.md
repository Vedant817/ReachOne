# ReachOne: The AI-Native Onebox

**ReachOne** is an advanced, self-hosted email aggregator designed for power users, sales teams, and recruiters. It transforms your inbox from a passive storage bin into an active, intelligent assistant.

By unifying multiple IMAP accounts into a single "Onebox," ReachOne doesn't just show you emails—it understands them. It categorizes incoming messages, filters the noise, and uses Retrieval-Augmented Generation (RAG) to draft context-aware replies based on your specific goals (agendas).

## 🚀 Why ReachOne? (USP)

*   **🧠 Context-Aware Intelligence:** Unlike standard AI auto-replies, ReachOne uses **RAG (Retrieval-Augmented Generation)**. It "reads" your custom agendas (e.g., product pitches, hiring criteria) stored in a vector database to generate replies that are factually aligned with your goals.
*   **🔒 Privacy-First Architecture:** Your email data is indexed in a **locally hosted Elasticsearch** instance. Search is fast, private, and doesn't rely on third-party cloud storage for indexing.
*   **⚡ Real-Time "Onebox":** Syncs with multiple IMAP providers (Gmail, Outlook, Yahoo, etc.) simultaneously via persistent IDLE connections. You get a single, unified view of all your communications.
*   **🔔 Action-Oriented Workflows:** Never miss a hot lead. ReachOne identifies "Interested" prospects and instantly notifies you via **Slack**, turning email into a real-time sales channel.
*   **💸 Cost-Effective AI:** Built to leverage cost-efficient and open models via **OpenRouter** (e.g., Nvidia Nemotron) and **Hugging Face**, avoiding the high costs of proprietary heavyweights while maintaining high performance.

## ✨ Key Features

### 1. Unified Real-Time Sync
*   Connect unlimited IMAP accounts.
*   Persistent `IDLE` connections ensure new emails appear instantly (no polling delays).
*   Fetches historical emails (default: last 30 days) for immediate context.

### 2. Intelligent Categorization & Filtering
*   Automatically sorts emails into actionable buckets:
    *   **Interested:** High-priority leads.
    *   **Meeting Booked:** Calendar confirmations.
    *   **Not Interested / Spam:** Noise to ignore.
    *   **Out of Office:** Temporary unavailabilities.
*   *Under the hood:* Uses a hybrid approach of keyword heuristics and pattern matching for speed and accuracy.

### 3. RAG-Powered "Smart Replies"
*   **Store Agendas:** Upload your "knowledge base"—sales scripts, FAQs, or project details—into the vector store.
*   **Contextual Generation:** When you click "Suggest Reply," the system finds the most relevant parts of your agenda and uses an LLM to craft a personalized response that advances the conversation.
*   **Conversation Aware:** It reads the full thread history to ensure the reply makes sense in context.

### 4. Enterprise-Grade Search
*   Full-text search across all accounts and folders.
*   Powered by a local **Elasticsearch** node for millisecond-latency results.
*   Complex filtering by sender, date, category, and account.

### 5. Slack Integration
*   Real-time alerts for "Interested" emails.
*   Webhooks for triggering external automation (e.g., update CRM, ping Discord).

## 🛠️ Tech Stack

*   **Frontend:** [Next.js 15+](https://nextjs.org/) (App Router), [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/)
*   **Backend:** [Node.js](https://nodejs.org/) with [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
*   **Database:** 
    *   [Elasticsearch](https://www.elastic.co/) (Email storage & search)
    *   [HNSWLib](https://github.com/nmslib/hnswlib) / In-memory Vector Store (Embeddings)
*   **AI & LLM:**
    *   [OpenRouter](https://openrouter.ai/) (Model serving)
    *   [Hugging Face Inference API](https://huggingface.co/inference-api) (Embeddings & Fallback LLMs)
*   **Email Protocol:** [node-imap](https://github.com/mscdex/node-imap) (IMAP IDLE & Fetching)
*   **Infrastructure:** [Docker](https://www.docker.com/) (Elasticsearch containerization)

## ⚡ Getting Started

### Prerequisites
*   Node.js 18+
*   Docker (for Elasticsearch)
*   IMAP enabled on your email accounts

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Vedant817/ReachOne.git
    cd ReachOne
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start Elasticsearch (via Docker):**
    ```bash
    docker-compose up -d
    ```

4.  **Configure Environment:**
    Create a `.env.local` file with the following keys:
    ```env
    # Auth
    NEXTAUTH_SECRET=your_secret_key
    NEXTAUTH_URL=http://localhost:3000

    # AI (Optional but recommended)
    OPENROUTER_API_KEY=your_openrouter_key
    HUGGINGFACE_API_KEY=your_hf_key

    # Database
    ELASTICSEARCH_NODE=http://localhost:9200
    ```

5.  **Run the application:**
    ```bash
    npm run dev
    ```

6.  **Open in Browser:**
    Navigate to `http://localhost:3000`. You will be prompted to create an account and configure your IMAP credentials during onboarding.
