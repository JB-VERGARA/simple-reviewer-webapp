"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Question = {
  id: string;
  question: string;
  answer: string;
  question_type: string;
  options: string[] | null;
};

export default function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  const [deckId, setDeckId] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Question modal
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<Question | null>(null);

  // Deck modal
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [editingDeckTitle, setEditingDeckTitle] = useState("");
  const [editingDeckDescription, setEditingDeckDescription] =
    useState("");

  // Delete deck modal
  const [showDeleteDeckModal, setShowDeleteDeckModal] =
    useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionType, setQuestionType] = useState("flashcard");
  const [options, setOptions] = useState(["", "", "", ""]);

  const [saving, setSaving] = useState(false);
  const [savingDeck, setSavingDeck] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);

  const [error, setError] = useState("");
  const [deckError, setDeckError] = useState("");

  useEffect(() => {
    async function loadDeck() {
      const { id } = await params;

      setDeckId(id);

      const [deckResult, questionsResult] = await Promise.all([
        supabase
          .from("decks")
          .select("title, description")
          .eq("id", id)
          .single(),

        supabase
          .from("questions")
          .select(
            "id, question, answer, question_type, options"
          )
          .eq("deck_id", id)
          .order("created_at", { ascending: true }),
      ]);

      if (deckResult.error) {
        console.error(deckResult.error);
        setError("Unable to load this deck.");
      } else if (deckResult.data) {
        setDeckTitle(deckResult.data.title);
        setDeckDescription(deckResult.data.description || "");
      }

      if (questionsResult.error) {
        console.error(questionsResult.error);
        setError("Unable to load questions.");
      } else {
        setQuestions(questionsResult.data || []);
      }

      setLoading(false);
    }

    loadDeck();
  }, [params]);

  // =========================
  // QUESTION FUNCTIONS
  // =========================

  function resetForm() {
    setQuestion("");
    setAnswer("");
    setQuestionType("flashcard");
    setOptions(["", "", "", ""]);
    setEditingQuestion(null);
    setError("");
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(item: Question) {
    setEditingQuestion(item);
    setQuestion(item.question);
    setAnswer(item.answer);
    setQuestionType(item.question_type);

    if (item.options && item.options.length > 0) {
      const updatedOptions = [...item.options];

      while (updatedOptions.length < 4) {
        updatedOptions.push("");
      }

      setOptions(updatedOptions.slice(0, 4));
    } else {
      setOptions(["", "", "", ""]);
    }

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetForm();
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    if (!answer.trim()) {
      setError("Please enter the answer.");
      return;
    }

    let cleanedOptions: string[] = [];

    if (questionType === "multiple_choice") {
      cleanedOptions = options
        .map((option) => option.trim())
        .filter(Boolean);

      if (cleanedOptions.length < 2) {
        setError(
          "Multiple choice questions need at least 2 choices."
        );
        return;
      }

      if (!cleanedOptions.includes(answer.trim())) {
        setError(
          "The correct answer must match one of the choices."
        );
        return;
      }
    }

    setSaving(true);

    if (editingQuestion) {
      const { data, error } = await supabase
        .from("questions")
        .update({
          question: question.trim(),
          answer: answer.trim(),
          question_type: questionType,
          options:
            questionType === "multiple_choice"
              ? cleanedOptions
              : null,
        })
        .eq("id", editingQuestion.id)
        .select()
        .single();

      if (error) {
        console.error(error);
        setError("Unable to update the question.");
        setSaving(false);
        return;
      }

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === editingQuestion.id ? data : item
        )
      );
    } else {
      const { data, error } = await supabase
        .from("questions")
        .insert({
          deck_id: deckId,
          question: question.trim(),
          answer: answer.trim(),
          question_type: questionType,
          options:
            questionType === "multiple_choice"
              ? cleanedOptions
              : null,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        setError("Unable to add the question.");
        setSaving(false);
        return;
      }

      setQuestions((prev) => [...prev, data]);
    }

    setSaving(false);
    setShowModal(false);
    resetForm();
  }

  async function deleteQuestion(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this question?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      setError("Unable to delete the question.");
      return;
    }

    setQuestions((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }

  // =========================
  // DECK FUNCTIONS
  // =========================

  function openEditDeckModal() {
    setEditingDeckTitle(deckTitle);
    setEditingDeckDescription(deckDescription);
    setDeckError("");
    setShowDeckModal(true);
  }

  function closeEditDeckModal() {
    if (savingDeck) return;

    setShowDeckModal(false);
    setDeckError("");
  }

  async function saveDeck(e: React.FormEvent) {
    e.preventDefault();

    setDeckError("");

    if (!editingDeckTitle.trim()) {
      setDeckError("Please enter a deck title.");
      return;
    }

    setSavingDeck(true);

    const { data, error } = await supabase
      .from("decks")
      .update({
        title: editingDeckTitle.trim(),
        description:
          editingDeckDescription.trim() || null,
      })
      .eq("id", deckId)
      .select()
      .single();

    if (error) {
      console.error(error);
      setDeckError("Unable to update the deck.");
      setSavingDeck(false);
      return;
    }

    setDeckTitle(data.title);
    setDeckDescription(data.description || "");

    setSavingDeck(false);
    setShowDeckModal(false);
  }

  async function deleteDeck() {
    if (!deckId) return;

    setDeletingDeck(true);

    const { error } = await supabase
      .from("decks")
      .delete()
      .eq("id", deckId);

    if (error) {
      console.error(error);
      setDeletingDeck(false);
      setShowDeleteDeckModal(false);
      setError("Unable to delete this deck.");
      return;
    }

    router.push("/");
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

          <p className="mt-4 text-sm text-slate-500">
            Loading deck...
          </p>
        </div>
      </main>
    );
  }

  // =========================
  // PAGE
  // =========================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* BACK */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            ← Back to Decks
          </Link>
        </div>

        {/* DECK HEADER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="min-w-0">
              <div className="mb-4 h-1 w-10 rounded-full bg-slate-900" />

              <h1 className="break-words text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                {deckTitle}
              </h1>

              {deckDescription && (
                <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-500 sm:text-base">
                  {deckDescription}
                </p>
              )}

              <div className="mt-4 text-sm text-slate-400">
                {questions.length}{" "}
                {questions.length === 1
                  ? "question"
                  : "questions"}
              </div>
            </div>

            {/* MAIN ACTIONS */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={`/decks/${deckId}/review`}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Start Review
              </Link>

              <button
                onClick={openAddModal}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
              >
                + Add Question
              </button>

              <button
                onClick={openEditDeckModal}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Edit Deck
              </button>

              <button
                onClick={() => setShowDeleteDeckModal(true)}
                className="min-h-12 w-full rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 sm:w-auto"
              >
                Delete Deck
              </button>
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && !showModal && !showDeckModal && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* QUESTIONS */}
        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Questions
            </h2>

            <span className="text-sm text-slate-400">
              {questions.length}
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                No questions yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add your first question to this deck and
                start building your reviewer.
              </p>

              <button
                onClick={openAddModal}
                className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Add Question
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((item, index) => {
                const isMultipleChoice =
                  item.question_type === "multiple_choice";

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                          {index + 1}
                        </span>

                        <div className="min-w-0">
                          <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {isMultipleChoice
                              ? "Multiple Choice"
                              : "Flashcard"}
                          </span>

                          <h3 className="mt-3 break-words text-base font-bold leading-6 text-slate-900 sm:text-lg">
                            {item.question}
                          </h3>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2 sm:ml-4">
                        <button
                          onClick={() =>
                            openEditModal(item)
                          }
                          className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            deleteQuestion(item.id)
                          }
                          className="min-h-10 flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 sm:flex-none"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Answer
                      </p>

                      <p className="mt-2 break-words text-sm leading-6 text-slate-800">
                        {item.answer}
                      </p>
                    </div>

                    {isMultipleChoice &&
                      item.options &&
                      item.options.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {item.options.map(
                            (option, optionIndex) => {
                              const isCorrect =
                                option === item.answer;

                              return (
                                <div
                                  key={`${item.id}-${optionIndex}`}
                                  className={`min-w-0 rounded-xl border p-3 text-sm ${
                                    isCorrect
                                      ? "border-slate-400 bg-slate-100 font-semibold text-slate-900"
                                      : "border-slate-200 bg-white text-slate-600"
                                  }`}
                                >
                                  <span className="mr-2 font-bold">
                                    {String.fromCharCode(
                                      65 + optionIndex
                                    )}
                                    .
                                  </span>

                                  <span className="break-words">
                                    {option}
                                  </span>

                                  {isCorrect && (
                                    <span className="ml-2 text-xs text-slate-400">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* =========================
          ADD / EDIT QUESTION MODAL
          ========================= */}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingQuestion
                    ? "Edit Question"
                    : "Add Question"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a flashcard or multiple choice
                  question.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveQuestion}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Question type
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setQuestionType("flashcard")
                    }
                    className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${
                      questionType === "flashcard"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Flashcard
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setQuestionType("multiple_choice")
                    }
                    className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${
                      questionType === "multiple_choice"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Multiple Choice
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="question"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Question
                </label>

                <textarea
                  id="question"
                  value={question}
                  onChange={(e) =>
                    setQuestion(e.target.value)
                  }
                  rows={4}
                  placeholder="Enter your question..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {questionType === "multiple_choice" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Choices
                  </label>

                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                          {String.fromCharCode(
                            65 + index
                          )}
                        </span>

                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            updateOption(
                              index,
                              e.target.value
                            )
                          }
                          placeholder={`Choice ${String.fromCharCode(
                            65 + index
                          )}`}
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="answer"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  {questionType === "multiple_choice"
                    ? "Correct answer"
                    : "Answer"}
                </label>

                {questionType === "multiple_choice" ? (
                  <select
                    id="answer"
                    value={answer}
                    onChange={(e) =>
                      setAnswer(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      Select correct answer
                    </option>

                    {options
                      .filter((option) => option.trim())
                      .map((option, index) => (
                        <option
                          key={index}
                          value={option}
                        >
                          {option}
                        </option>
                      ))}
                  </select>
                ) : (
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(e) =>
                      setAnswer(e.target.value)
                    }
                    rows={4}
                    placeholder="Enter the answer..."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {saving
                    ? "Saving..."
                    : editingQuestion
                    ? "Save Changes"
                    : "Add Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          EDIT DECK MODAL
          ========================= */}

      {showDeckModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeEditDeckModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Edit Deck
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update the deck title or description.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditDeckModal}
                disabled={savingDeck}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveDeck}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="edit-deck-title"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Deck title
                </label>

                <input
                  id="edit-deck-title"
                  type="text"
                  value={editingDeckTitle}
                  onChange={(e) =>
                    setEditingDeckTitle(e.target.value)
                  }
                  placeholder="e.g. Networking Basics"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="edit-deck-description"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Description
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="edit-deck-description"
                  value={editingDeckDescription}
                  onChange={(e) =>
                    setEditingDeckDescription(
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="What is this deck about?"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {deckError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {deckError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditDeckModal}
                  disabled={savingDeck}
                  className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingDeck}
                  className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {savingDeck
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          DELETE DECK MODAL
          ========================= */}

      {showDeleteDeckModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingDeck) {
              setShowDeleteDeckModal(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-5 shadow-xl sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              !
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Delete this deck?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will permanently delete{" "}
              <span className="font-semibold text-slate-800">
                "{deckTitle}"
              </span>{" "}
              and all{" "}
              <span className="font-semibold text-slate-800">
                {questions.length}{" "}
                {questions.length === 1
                  ? "question"
                  : "questions"}
              </span>{" "}
              inside it.
            </p>

            <p className="mt-3 text-sm font-medium text-red-600">
              This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteDeckModal(false)
                }
                disabled={deletingDeck}
                className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={deleteDeck}
                disabled={deletingDeck}
                className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {deletingDeck
                  ? "Deleting..."
                  : "Delete Deck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}