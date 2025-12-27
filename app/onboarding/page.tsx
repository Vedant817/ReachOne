"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    imapUser: "",
    imapPassword: "",
    imapHost: "imap.gmail.com",
    slackToken: "",
    slackChannel: "#general",
    webhookUrl: "",
    huggingfaceApiKey: "",
    elasticsearchHosts: "http://localhost:9200",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.imapUser || !formData.imapPassword || !formData.slackToken) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save configuration");
        setLoading(false);
      } else {
        setLoading(false);
        await signOut({ callbackUrl: "/login" }); // Force SignIn and login with correct credentials
        // router.push("/")
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Configure Your Integration
          </h2>
          <p className="mt-4 text-gray-600">
            Please provide your API keys and configuration to get started with
            ReachOne.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Email Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="imapUser"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  id="imapUser"
                  name="imapUser"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.imapUser}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="imapPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  App Password *
                </label>
                <input
                  type="password"
                  id="imapPassword"
                  name="imapPassword"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.imapPassword}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use your app password (not your regular password) for Gmail
                </p>
              </div>

              <div>
                <label
                  htmlFor="imapHost"
                  className="block text-sm font-medium text-gray-700"
                >
                  IMAP Host
                </label>
                <input
                  type="text"
                  id="imapHost"
                  name="imapHost"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.imapHost}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Slack Integration
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="slackToken"
                  className="block text-sm font-medium text-gray-700"
                >
                  Slack Bot Token *
                </label>
                <input
                  type="text"
                  id="slackToken"
                  name="slackToken"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.slackToken}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-500">Starts with xoxb-</p>
              </div>

              <div>
                <label
                  htmlFor="slackChannel"
                  className="block text-sm font-medium text-gray-700"
                >
                  Default Slack Channel
                </label>
                <input
                  type="text"
                  id="slackChannel"
                  name="slackChannel"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.slackChannel}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Webhook Configuration
            </h3>
            <div>
              <label
                htmlFor="webhookUrl"
                className="block text-sm font-medium text-gray-700"
              >
                Webhook URL
              </label>
              <input
                type="url"
                id="webhookUrl"
                name="webhookUrl"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.webhookUrl}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional webhook URL for external integrations
              </p>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              AI Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="huggingfaceApiKey"
                  className="block text-sm font-medium text-gray-700"
                >
                  HuggingFace API Key
                </label>
                <input
                  type="text"
                  id="huggingfaceApiKey"
                  name="huggingfaceApiKey"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.huggingfaceApiKey}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Search Configuration
            </h3>
            <div>
              <label
                htmlFor="elasticsearchHosts"
                className="block text-sm font-medium text-gray-700"
              >
                Elasticsearch URL
              </label>
              <input
                type="url"
                id="elasticsearchHosts"
                name="elasticsearchHosts"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.elasticsearchHosts}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Complete Setup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
