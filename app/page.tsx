"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Email {
  subject: string;
  from: { text: string };
  date: string;
  category: string;
  text: string;
}

const categoryColorMap: { [key: string]: string } = {
  Interested: "bg-green-100 text-green-800",
  "Meeting Booked": "bg-blue-100 text-blue-800",
  "Not Interested": "bg-red-100 text-red-800",
  Spam: "bg-yellow-100 text-yellow-800",
  "Out of Office": "bg-purple-100 text-purple-800",
  Uncategorized: "bg-gray-100 text-gray-800",
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [agenda, setAgenda] = useState("");
  const [suggestedReply, setSuggestedReply] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [replyContext, setReplyContext] = useState("");
  const [replySimilarity, setReplySimilarity] = useState<number | null>(null);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [conversationContext, setConversationContext] = useState<string | null>(
    null,
  );
  const [usedAgendas, setUsedAgendas] = useState<
    Array<{ id: number; content: string; similarity: number }>
  >([]);

  const handleCopyReply = async () => {
    if (suggestedReply && suggestedReply !== "Generating reply...") {
      try {
        await navigator.clipboard.writeText(suggestedReply);
        // Could add a toast notification here
        alert("Reply copied to clipboard!");
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = suggestedReply;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Reply copied to clipboard!");
      }
    }
  };

  const handleFetchEmails = async () => {
    setIsLoadingEmails(true);
    try {
      console.log("Manually fetching emails...");
      const fetchResponse = await fetch("/api/v1/fetch-emails", {
        method: "POST",
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        console.error("Failed to fetch emails:", errorData);
        alert("Failed to fetch emails: " + errorData.error);
      } else {
        const fetchData = await fetchResponse.json();
        console.log(
          `Fetched ${fetchData.emails?.length || 0} emails from IMAP`,
        );
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
      alert("Failed to fetch emails: " + (error as Error).message);
    }

    // Reload emails from Elasticsearch
    await loadEmails();
    setIsLoadingEmails(false);
  };

  const handleCleanupDuplicates = async () => {
    setIsLoadingEmails(true);
    try {
      console.log("Cleaning up duplicate emails...");
      const cleanupResponse = await fetch("/api/v1/emails/cleanup", {
        method: "DELETE",
      });

      if (!cleanupResponse.ok) {
        const errorData = await cleanupResponse.json();
        console.error("Failed to cleanup duplicates:", errorData);
        alert("Failed to cleanup duplicates: " + errorData.error);
      } else {
        const cleanupData = await cleanupResponse.json();
        console.log(
          `Cleaned up ${cleanupData.duplicatesRemoved} duplicate emails`,
        );
        alert(`Cleaned up ${cleanupData.duplicatesRemoved} duplicate emails!`);
      }
    } catch (error) {
      console.error("Failed to cleanup duplicates:", error);
      alert("Failed to cleanup duplicates: " + (error as Error).message);
    }

    // Reload emails from Elasticsearch
    await loadEmails();
    setIsLoadingEmails(false);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      status === "authenticated" &&
      session?.user &&
      !session.user.onboardingCompleted
    ) {
      router.push("/onboarding");
    }
  }, [status, session?.user?.onboardingCompleted, router]);

  const loadEmails = async () => {
    try {
      const response = await fetch(
        `/api/v1/emails?search=${search}&category=${category}`,
      );
      const data = await response.json();

      if (data.emails && Array.isArray(data.emails)) {
        console.log(`Loaded ${data.emails.length} emails from Elasticsearch`);
        setEmails(data.emails);
      } else {
        console.log("No emails found in Elasticsearch");
        setEmails([]);
      }
    } catch (error) {
      console.error("Error loading emails:", error);
      setEmails([]);
    }
  };

  useEffect(() => {
    const initializeEmails = async () => {
      if (status === "authenticated" && session?.user?.onboardingCompleted) {
        setIsLoadingEmails(true);

        try {
          console.log("Fetching emails from IMAP...");
          const fetchResponse = await fetch("/api/v1/fetch-emails", {
            method: "POST",
          });

          if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            console.error("Failed to fetch emails:", errorData);
          } else {
            const fetchData = await fetchResponse.json();
            console.log(
              `Fetched ${fetchData.emails?.length || 0} emails from IMAP`,
            );
          }
        } catch (error) {
          console.error("Failed to fetch emails:", error);
        }

        // Then load emails from Elasticsearch
        console.log("Loading emails from Elasticsearch...");
        await loadEmails();
        setIsLoadingEmails(false);
        console.log("Email loading complete");
      }
    };

    initializeEmails();
  }, [status, session?.user?.onboardingCompleted]);

  const handleStoreAgenda = async () => {
    await fetch("/api/v1/vector/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: agenda }),
    });
    alert("Agenda stored!");
  };

  const handleSuggestReply = async (email: Email) => {
    setSelectedEmail(email);
    setSuggestedReply("Generating reply...");
    setReplyContext("");
    setReplySimilarity(null);
    setConversationContext(null);
    setUsedAgendas([]);

    try {
      const response = await fetch("/api/v1/vector/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.text }),
      });
      const data = await response.json();

      if (data.error) {
        setSuggestedReply(
          `⚠️ Error: ${data.error}\n\nTip: Make sure you have configured your API keys in the onboarding settings.`,
        );
      } else if (data.hasMatchingAgenda === false) {
        // No matching agenda found
        setSuggestedReply(data.suggestion);
        setReplyContext("");
        setReplySimilarity(data.bestMatchSimilarity || null);
        setUsedAgendas([]);
      } else if (data.suggestion) {
        // Has matching agenda
        setSuggestedReply(data.suggestion);
        setReplyContext(data.context || "");
        setReplySimilarity(data.similarity || null);
        setConversationContext(data.conversationContext || null);
        setUsedAgendas(data.agendas || []);
      } else {
        setSuggestedReply(
          "Unable to generate a reply at this moment. Please try again later.",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setSuggestedReply(
        `⚠️ Error generating reply: ${errorMessage}\n\nPlease check your internet connection and try again.`,
      );
    }
  };

  // Show loading spinner while session is loading
  if (status === "loading") {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              AI-Powered Replies
            </h2>
            <textarea
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your product and outreach agenda..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
            <button
              className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={handleStoreAgenda}
            >
              Store Agenda
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="w-1/2">
              <Input
                type="text"
                placeholder="Search..."
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-4">
              <select
                className="border border-gray-300 rounded-md px-2 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option className="rounded" value="">
                  All Categories
                </option>
                <option className="rounded" value="Interested">
                  Interested
                </option>
                <option className="rounded" value="Meeting Booked">
                  Meeting Booked
                </option>
                <option className="rounded" value="Not Interested">
                  Not Interested
                </option>
                <option className="rounded" value="Spam">
                  Spam
                </option>
                <option className="rounded" value="Out of Office">
                  Out of Office
                </option>
                <option className="rounded" value="Uncategorized">
                  Uncategorized
                </option>
              </select>
              <button
                onClick={handleFetchEmails}
                disabled={isLoadingEmails}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingEmails ? "Fetching..." : "Refresh Emails"}
              </button>
              <button
                onClick={handleCleanupDuplicates}
                disabled={isLoadingEmails}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingEmails ? "Cleaning..." : "Clean Duplicates"}
              </button>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {isLoadingEmails && (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Fetching your emails...</p>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    From
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Subject
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emails.map((email, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      {(() => {
                        const fromText = email.from.text || "";
                        const match = fromText.match(/(.*)<(.*)>/);
                        if (match) {
                          const name = match[1].trim().replace(/(^"|"$)/g, "");
                          const emailAddr = match[2].trim();
                          return `${name} (${emailAddr})`;
                        } else {
                          return fromText;
                        }
                      })()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {email.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryColorMap[email.category] || "bg-gray-100 text-gray-800"}`}
                      >
                        {email.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                      {new Date(email.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:underline cursor-pointer"
                        onClick={() => handleSuggestReply(email)}
                      >
                        Suggest Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog
          open={!!selectedEmail}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setSelectedEmail(null);
              setSuggestedReply("");
              setReplyContext("");
              setReplySimilarity(null);
              setConversationContext(null);
              setUsedAgendas([]);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                AI-Generated Reply for: {selectedEmail?.subject}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {conversationContext && (
                <div className="p-3 bg-green-50 rounded-md border border-green-200">
                  <h4 className="text-sm font-medium text-green-900 mb-2">
                    Conversation History Detected:
                  </h4>
                  <div className="text-sm text-green-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {conversationContext}
                  </div>
                </div>
              )}

              {replyContext && (
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Agenda Context Used ({usedAgendas.length} agendas combined):
                  </h4>
                  <p className="text-sm text-blue-800">{replyContext}</p>
                  {usedAgendas.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-blue-700 font-medium">
                        Agendas used:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {usedAgendas.slice(0, 2).map((agenda, index) => (
                          <span
                            key={agenda.id || index}
                            className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                            title={`Similarity: ${(agenda.similarity * 100).toFixed(1)}%`}
                          >
                            Agenda {index + 1} (
                            {(agenda.similarity * 100).toFixed(0)}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Suggested Reply:
                  </h4>
                  {suggestedReply &&
                    suggestedReply !== "Generating reply..." && (
                      <button
                        onClick={handleCopyReply}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Copy to clipboard"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy
                      </button>
                    )}
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200 max-h-64 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {suggestedReply}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                onClick={() => {
                  setSelectedEmail(null);
                  setSuggestedReply("");
                  setReplyContext("");
                  setReplySimilarity(null);
                  setConversationContext(null);
                  setUsedAgendas([]);
                }}
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
