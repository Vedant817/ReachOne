"use client";

import { useState, useEffect } from "react";

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
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [agenda, setAgenda] = useState("");
  const [suggestedReply, setSuggestedReply] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  useEffect(() => {
    const fetchEmails = async () => {
      const response = await fetch(
        `/api/v1/emails?search=${search}&category=${category}`,
      );
      const data = await response.json();
      if (data.emails && Array.isArray(data.emails)) {
        setEmails(data.emails);
      } else {
        setEmails([]);
      }
    };

    fetchEmails();
  }, [search, category]);

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
    const response = await fetch("/api/v1/vector/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.text }),
    });
    const data = await response.json();
    setSuggestedReply(data.suggestion);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Onebox
          </h1>
        </div>
      </header>
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
              <input
                type="text"
                placeholder="Search..."
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full border border-gray-300 rounded-md px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Interested">Interested</option>
                <option value="Meeting Booked">Meeting Booked</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Spam">Spam</option>
                <option value="Out of Office">Out of Office</option>
                <option value="Uncategorized">Uncategorized</option>
              </select>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                      {email.from.text}
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
                        className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:underline"
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

        {selectedEmail && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                aria-hidden="true"
              ></div>
              <div className="bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Suggested Reply for: {selectedEmail.subject}
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {suggestedReply}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setSelectedEmail(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
