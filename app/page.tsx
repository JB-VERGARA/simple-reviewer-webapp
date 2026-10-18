"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Deck = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export default function HomePage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDecks();
  }, []);

  async function loadDecks() {
    setLoading(true);

    const { data, error } = await supabase
      .from("decks")
      .select("id, title, description, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Unable to load your decks.");
    } else {
      setDecks(data || []);
    }

    setLoading(false);
  }

  async function createDeck(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a deck title.");
      return;
    }

    setCreating(true);
    setError("");

    const { data, error } = await supabase
      .from("decks")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setError("Unable to create the deck.");
      setCreating(false);
      return;
    }

    if (data) {
      setDecks((prev) => [data, ...prev]);
    }

    setTitle("");
    setDescription("");
    setShowModal(false);
    setCreating(false);
  }

  function closeModal() {
    if (creating) return;

    setShowModal(false);
    setTitle("");
    setDescription("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Reviewer
              </p>

              <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Your Review Decks
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                Choose a deck and start reviewing your questions.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="w-full shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
            >
              + New Deck
            </button>
          </div>
        </header>

        {/* Error */}
        {error && !showModal && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

            <p className="mt-4 text-sm text-slate-500">
              Loading your decks...
            </p>
          </div>
        ) : decks.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
            <div className="mx-auto max-w-md">
              <h2 className="text-xl font-bold text-slate-900">
                No review decks yet
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create your first deck to start adding questions and reviewing
                your material.
              </p>

              <button
                onClick={() => setShowModal(true)}
                className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Create Your First Deck
              </button>
            </div>
          </div>
        ) : (
          /* Deck grid */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <article
                key={deck.id}
                className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6"
              >
                {/* Small accent */}
                <div className="mb-5 h-1 w-10 rounded-full bg-slate-900" />

                {/* Deck information */}
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-lg font-bold leading-6 text-slate-900">
                    {deck.title}
                  </h2>

                  <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-500">
                    {deck.description || "No description provided."}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>Review deck</span>

                    <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

                    <span>
                      {new Date(deck.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Open button */}
                <Link
                  href={`/decks/${deck.id}`}
                  className="mt-5 flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <span>Open Deck</span>

                  <span
                    aria-hidden="true"
                    className="text-base transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}

        {/* Create Deck Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeModal();
              }
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
              {/* Modal header */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900">
                      Create New Deck
                    </h2>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Give your review deck a name and optional description.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={creating}
                    aria-label="Close"
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={createDeck} className="space-y-5">
                {/* Title */}
                <div>
                  <label
                    htmlFor="deck-title"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Deck title
                  </label>

                  <input
                    id="deck-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Networking Basics"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="deck-description"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Description
                    <span className="ml-1 font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="deck-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this deck about?"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Modal error */}
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={creating}
                    className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {creating ? "Creating..." : "Create Deck"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}