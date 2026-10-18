"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Question = {
  id: string;
  question: string;
  answer: string;
  question_type: string;
  options: string[] | null;
};

function shuffleQuestions(items: Question[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [deckId, setDeckId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(
    null
  );

  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReview() {
      const { id } = await params;

      setDeckId(id);

      const { data, error } = await supabase
        .from("questions")
        .select("id, question, answer, question_type, options")
        .eq("deck_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setQuestions(shuffleQuestions(data || []));
      setLoading(false);
    }

    loadReview();
  }, [params]);

  const currentQuestion = questions[currentIndex];

  function goToNextQuestion() {
    setShowAnswer(false);
    setSelectedAnswer(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setFinished(true);
    }
  }

  function goToPreviousQuestion() {
    setShowAnswer(false);
    setSelectedAnswer(null);

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function handleFlashcardResult(correct: boolean) {
    if (correct) {
      setScore((prev) => prev + 1);
    }

    goToNextQuestion();
  }

  function handleMultipleChoiceAnswer(option: string) {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(option);

    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    }
  }

  function restartReview() {
    setQuestions(shuffleQuestions(questions));
    setCurrentIndex(0);
    setScore(0);
    setShowAnswer(false);
    setSelectedAnswer(null);
    setFinished(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

          <p className="mt-4 text-sm text-slate-500">
            Loading review...
          </p>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/decks/${deckId}`}
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            ← Back to Deck
          </Link>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <h1 className="text-2xl font-bold text-slate-900">
              No questions yet
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add some questions to this deck before starting a
              review.
            </p>

            <Link
              href={`/decks/${deckId}`}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Add Questions
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (finished) {
    const percentage = Math.round(
      (score / questions.length) * 100
    );

    const passed = percentage >= 70;

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <Link
              href={`/decks/${deckId}`}
              className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
            >
              ← Back to Deck
            </Link>
          </div>

          <div
            className={`rounded-2xl border bg-white p-6 text-center shadow-sm sm:p-10 ${
              passed
                ? "border-green-200"
                : "border-red-200"
            }`}
          >
            {/* Result status */}
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
                passed
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {passed ? "✓" : "!"}
            </div>

            <p
              className={`mt-5 text-xs font-bold uppercase tracking-[0.2em] ${
                passed
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {passed ? "Good Job" : "Keep Practicing"}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Review Complete
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Here&apos;s how you did.
            </p>

            {/* Score */}
            <div
              className={`mt-8 rounded-2xl border p-6 sm:p-8 ${
                passed
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p
                className={`text-5xl font-bold tracking-tight sm:text-6xl ${
                  passed
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {percentage}%
              </p>

              <p
                className={`mt-3 text-sm font-medium ${
                  passed
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {score} out of {questions.length} correct
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={restartReview}
                className="min-h-12 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Review Again
              </button>

              <Link
                href={`/decks/${deckId}`}
                className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Back to Deck
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isMultipleChoice =
    currentQuestion.question_type === "multiple_choice";

  const progress =
    ((currentIndex + 1) / questions.length) * 100;

  const hasAnsweredMultipleChoice =
    selectedAnswer !== null;

  const multipleChoiceCorrect =
    selectedAnswer === currentQuestion.answer;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/decks/${deckId}`}
            className="inline-flex min-h-10 w-fit items-center rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            ← Back to Deck
          </Link>

          <div className="text-sm font-semibold text-slate-500">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-300"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        {/* Question Card */}
        <div
          className={`mt-6 rounded-2xl border bg-white p-5 shadow-sm transition-colors sm:p-8 ${
            isMultipleChoice && hasAnsweredMultipleChoice
              ? multipleChoiceCorrect
                ? "border-green-200"
                : "border-red-200"
              : "border-slate-200"
          }`}
        >
          {/* Type */}
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              {isMultipleChoice
                ? "Multiple Choice"
                : "Flashcard"}
            </span>

            <span className="text-xs font-medium text-slate-400">
              {currentIndex + 1}/{questions.length}
            </span>
          </div>

          {/* Question */}
          <h1 className="mt-6 break-words text-2xl font-bold leading-9 text-slate-900 sm:text-3xl sm:leading-10">
            {currentQuestion.question}
          </h1>

          {/* ========================= */}
          {/* FLASHCARD */}
          {/* ========================= */}

          {!isMultipleChoice && (
            <div className="mt-8">
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="min-h-14 w-full rounded-xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Show Answer
                </button>
              ) : (
                <>
                  {/* Answer */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Answer
                    </p>

                    <p className="mt-3 break-words text-base font-semibold leading-7 text-slate-900 sm:text-lg">
                      {currentQuestion.answer}
                    </p>
                  </div>

                  {/* Flashcard result */}
                  <div className="mt-8">
                    <p className="text-center text-base font-bold text-slate-800">
                      Did you get it right?
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        onClick={() =>
                          handleFlashcardResult(true)
                        }
                        className="min-h-14 rounded-xl border-2 border-green-200 bg-green-50 px-5 py-3 text-sm font-bold text-green-700 transition hover:border-green-300 hover:bg-green-100"
                      >
                        <span className="mr-2">✓</span>
                        I got it right
                      </button>

                      <button
                        onClick={() =>
                          handleFlashcardResult(false)
                        }
                        className="min-h-14 rounded-xl border-2 border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                      >
                        <span className="mr-2">✕</span>
                        I got it wrong
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========================= */}
          {/* MULTIPLE CHOICE */}
          {/* ========================= */}

          {isMultipleChoice && (
            <div className="mt-8 space-y-3">
              {(currentQuestion.options || []).map(
                (option, index) => {
                  const isSelected =
                    selectedAnswer === option;

                  const isCorrect =
                    option === currentQuestion.answer;

                  let buttonClass =
                    "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50";

                  if (hasAnsweredMultipleChoice) {
                    if (isCorrect) {
                      buttonClass =
                        "border-green-400 bg-green-50 text-green-900";
                    } else if (isSelected) {
                      buttonClass =
                        "border-red-400 bg-red-50 text-red-900";
                    } else {
                      buttonClass =
                        "border-slate-200 bg-slate-50 text-slate-400";
                    }
                  }

                  return (
                    <button
                      key={`${option}-${index}`}
                      onClick={() =>
                        handleMultipleChoiceAnswer(option)
                      }
                      disabled={hasAnsweredMultipleChoice}
                      className={`flex min-h-14 w-full items-start gap-3 rounded-xl border-2 p-4 text-left text-sm transition ${buttonClass}`}
                    >
                      {/* Letter */}
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          hasAnsweredMultipleChoice &&
                          isCorrect
                            ? "bg-green-200 text-green-800"
                            : hasAnsweredMultipleChoice &&
                              isSelected
                            ? "bg-red-200 text-red-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>

                      {/* Option */}
                      <span className="min-w-0 break-words pt-1 leading-6">
                        {option}
                      </span>

                      {/* Result indicator */}
                      {hasAnsweredMultipleChoice &&
                        isCorrect && (
                          <span className="ml-auto shrink-0 pt-1 font-bold text-green-600">
                            ✓
                          </span>
                        )}

                      {hasAnsweredMultipleChoice &&
                        isSelected &&
                        !isCorrect && (
                          <span className="ml-auto shrink-0 pt-1 font-bold text-red-600">
                            ✕
                          </span>
                        )}
                    </button>
                  );
                }
              )}

              {/* Feedback */}
              {hasAnsweredMultipleChoice && (
                <div
                  className={`mt-6 rounded-2xl border-2 p-5 ${
                    multipleChoiceCorrect
                      ? "border-green-300 bg-green-50"
                      : "border-red-300 bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                        multipleChoiceCorrect
                          ? "bg-green-200 text-green-700"
                          : "bg-red-200 text-red-700"
                      }`}
                    >
                      {multipleChoiceCorrect ? "✓" : "✕"}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`font-bold ${
                          multipleChoiceCorrect
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {multipleChoiceCorrect
                          ? "Correct!"
                          : "Wrong answer"}
                      </p>

                      {!multipleChoiceCorrect && (
                        <p className="mt-1 break-words text-sm leading-6 text-red-700">
                          Correct answer:{" "}
                          <span className="font-bold">
                            {currentQuestion.answer}
                          </span>
                        </p>
                      )}

                      {multipleChoiceCorrect && (
                        <p className="mt-1 text-sm text-green-700">
                          Good job. You got this one right.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Next */}
              {hasAnsweredMultipleChoice && (
                <button
                  onClick={goToNextQuestion}
                  className="mt-1 min-h-14 w-full rounded-xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {currentIndex === questions.length - 1
                    ? "Finish Review"
                    : "Next Question"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={goToPreviousQuestion}
            disabled={currentIndex === 0}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>

          {!isMultipleChoice && !showAnswer && (
            <span className="hidden text-right text-xs text-slate-400 sm:block">
              Think about your answer before revealing it.
            </span>
          )}

          <div className="text-xs font-medium text-slate-400 sm:hidden">
            {currentIndex + 1}/{questions.length}
          </div>
        </div>
      </div>
    </main>
  );
}