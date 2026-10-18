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

const TIME_OPTIONS = [
  { label: "2 minutes", seconds: 2 * 60 },
  { label: "5 minutes", seconds: 5 * 60 },
  { label: "10 minutes", seconds: 10 * 60 },
  { label: "15 minutes", seconds: 15 * 60 },
  { label: "20 minutes", seconds: 20 * 60 },
  { label: "30 minutes", seconds: 30 * 60 },
];

function shuffleQuestions(items: Question[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
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

  const [loading, setLoading] = useState(true);

  // Review setup
  const [showSetup, setShowSetup] = useState(true);
  const [timeMode, setTimeMode] = useState<"preset" | "custom">(
    "preset"
  );
  const [selectedTime, setSelectedTime] = useState(5 * 60);
  const [customMinutes, setCustomMinutes] = useState("5");

  // Review state
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  const [timeLimit, setTimeLimit] = useState(5 * 60);
  const [timeRemaining, setTimeRemaining] = useState(5 * 60);
  const [finalTimeRemaining, setFinalTimeRemaining] = useState(0);

  // =========================
  // LOAD QUESTIONS
  // =========================

  useEffect(() => {
    async function loadReview() {
      const { id } = await params;

      setDeckId(id);

      const { data, error } = await supabase
        .from("questions")
        .select(
          "id, question, answer, question_type, options"
        )
        .eq("deck_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const shuffled = shuffleQuestions(data || []);

      setQuestions(shuffled);

      // Load the last selected time from this device.
      const savedTime = localStorage.getItem(
        "review_time_limit"
      );

      if (savedTime) {
        const parsedTime = Number(savedTime);

        if (parsedTime > 0) {
          setSelectedTime(parsedTime);
          setTimeLimit(parsedTime);
          setTimeRemaining(parsedTime);
          setCustomMinutes(
            String(Math.floor(parsedTime / 60))
          );

          const isPreset = TIME_OPTIONS.some(
            (option) => option.seconds === parsedTime
          );

          setTimeMode(isPreset ? "preset" : "custom");
        }
      }

      setLoading(false);
    }

    loadReview();
  }, [params]);

  // =========================
  // TIMER
  // =========================

  useEffect(() => {
    if (
      !started ||
      finished ||
      timeRemaining <= 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);

          setFinalTimeRemaining(0);
          setTimeUp(true);
          setFinished(true);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [started, finished, timeRemaining]);

  const currentQuestion = questions[currentIndex];

  // =========================
  // TIME SETUP
  // =========================

  function getSelectedTime() {
    if (timeMode === "preset") {
      return selectedTime;
    }

    const minutes = Number(customMinutes);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      return 0;
    }

    return Math.floor(minutes * 60);
  }

  function startReview() {
    const seconds = getSelectedTime();

    if (seconds <= 0) {
      return;
    }

    localStorage.setItem(
      "review_time_limit",
      String(seconds)
    );

    setTimeLimit(seconds);
    setTimeRemaining(seconds);

    setCurrentIndex(0);
    setScore(0);
    setShowAnswer(false);
    setSelectedAnswer(null);
    setFinished(false);
    setTimeUp(false);
    setFinalTimeRemaining(seconds);

    setStarted(true);
    setShowSetup(false);
  }

  function openSetup() {
    setShowSetup(true);
    setStarted(false);
  }

  // =========================
  // REVIEW FUNCTIONS
  // =========================

  function finishReview() {
    setFinalTimeRemaining(timeRemaining);
    setFinished(true);
  }

  function goToNextQuestion() {
    setShowAnswer(false);
    setSelectedAnswer(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishReview();
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
    const shuffled = shuffleQuestions(questions);

    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setShowAnswer(false);
    setSelectedAnswer(null);
    setFinished(false);
    setTimeUp(false);

    setTimeRemaining(timeLimit);
    setFinalTimeRemaining(timeLimit);

    setStarted(true);
    setShowSetup(false);
  }

  // =========================
  // LOADING
  // =========================

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

  // =========================
  // NO QUESTIONS
  // =========================

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

  // =========================
  // REVIEW SETUP
  // =========================

  if (showSetup) {
    const customTimeInvalid =
      timeMode === "custom" &&
      (!Number.isFinite(Number(customMinutes)) ||
        Number(customMinutes) <= 0);

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/decks/${deckId}`}
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            ← Back to Deck
          </Link>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                ⏱
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Review Setup
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Ready to Review?
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose how much time you want for this review.
              </p>
            </div>

            {/* QUESTION COUNT */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Questions
                </span>

                <span className="text-lg font-bold text-slate-900">
                  {questions.length}
                </span>
              </div>
            </div>

            {/* TIME OPTIONS */}
            <div className="mt-6">
              <label className="mb-3 block text-sm font-bold text-slate-800">
                Time Limit
              </label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TIME_OPTIONS.map((option) => {
                  const selected =
                    timeMode === "preset" &&
                    selectedTime === option.seconds;

                  return (
                    <button
                      key={option.seconds}
                      type="button"
                      onClick={() => {
                        setTimeMode("preset");
                        setSelectedTime(option.seconds);
                      }}
                      className={`min-h-14 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CUSTOM TIME */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setTimeMode("custom")}
                className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                  timeMode === "custom"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Custom Time
              </button>

              {timeMode === "custom" && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label
                    htmlFor="custom-minutes"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    How many minutes?
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      id="custom-minutes"
                      type="number"
                      min="1"
                      max="180"
                      value={customMinutes}
                      onChange={(e) =>
                        setCustomMinutes(e.target.value)
                      }
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />

                    <span className="text-sm font-medium text-slate-500">
                      minutes
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    You can choose between 1 and 180 minutes.
                  </p>
                </div>
              )}
            </div>

            {customTimeInvalid && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                Please enter a valid time limit.
              </div>
            )}

            {/* START */}
            <button
              type="button"
              onClick={startReview}
              disabled={customTimeInvalid}
              className="mt-6 min-h-14 w-full rounded-xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Review
            </button>

            <p className="mt-4 text-center text-xs text-slate-400">
              You can change the time limit whenever you start a
              new review.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================
  // RESULTS
  // =========================

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
            className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-10 ${
              passed
                ? "border-green-200"
                : "border-red-200"
            }`}
          >
            <div className="text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
                  timeUp
                    ? "bg-orange-100 text-orange-700"
                    : passed
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {timeUp ? "⏱" : passed ? "✓" : "!"}
              </div>

              <p
                className={`mt-5 text-xs font-bold uppercase tracking-[0.2em] ${
                  timeUp
                    ? "text-orange-600"
                    : passed
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {timeUp
                  ? "Time's Up"
                  : passed
                  ? "Good Job"
                  : "Keep Practicing"}
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                Review Complete
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {timeUp
                  ? "The time limit was reached."
                  : "Here's how you did."}
              </p>
            </div>

            {/* SCORE */}
            <div
              className={`mt-8 rounded-2xl border p-6 text-center sm:p-8 ${
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

            {/* TIME */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Time Limit
                </p>

                <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                  {formatTime(timeLimit)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Time Remaining
                </p>

                <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                  {formatTime(finalTimeRemaining)}
                </p>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={restartReview}
                className="min-h-12 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Review Again
              </button>

              <button
                onClick={openSetup}
                className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Change Time Limit
              </button>
            </div>

            <Link
              href={`/decks/${deckId}`}
              className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Back to Deck
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================
  // CURRENT REVIEW
  // =========================

  const isMultipleChoice =
    currentQuestion.question_type === "multiple_choice";

  const progress =
    ((currentIndex + 1) / questions.length) * 100;

  const hasAnsweredMultipleChoice =
    selectedAnswer !== null;

  const multipleChoiceCorrect =
    selectedAnswer === currentQuestion.answer;

  const isLowTime = timeRemaining <= 60;
  const isCriticalTime = timeRemaining <= 30;

  let timerClass =
    "border-slate-200 bg-white text-slate-800";

  if (isCriticalTime) {
    timerClass =
      "border-red-300 bg-red-50 text-red-700";
  } else if (isLowTime) {
    timerClass =
      "border-orange-300 bg-orange-50 text-orange-700";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* TOP BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/decks/${deckId}`}
            className="inline-flex min-h-10 w-fit items-center rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            ← Back to Deck
          </Link>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {/* TIMER */}
            <div
              className={`rounded-xl border px-4 py-2 shadow-sm ${timerClass}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {isCriticalTime ? "⚠" : "⏱"}
                </span>

                <span className="font-mono text-sm font-bold">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>

            <div className="text-sm font-semibold text-slate-500">
              Question {currentIndex + 1} of{" "}
              {questions.length}
            </div>
          </div>
        </div>

        {/* TIME LIMIT INFO */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>
            Time limit: {formatTime(timeLimit)}
          </span>

          {isLowTime && (
            <span
              className={`font-bold ${
                isCriticalTime
                  ? "text-red-600"
                  : "text-orange-600"
              }`}
            >
              {isCriticalTime
                ? "Hurry! Time is almost up."
                : "1 minute remaining."}
            </span>
          )}
        </div>

        {/* PROGRESS */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-300"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        {/* QUESTION CARD */}
        <div
          className={`mt-6 rounded-2xl border bg-white p-5 shadow-sm transition-colors sm:p-8 ${
            isMultipleChoice && hasAnsweredMultipleChoice
              ? multipleChoiceCorrect
                ? "border-green-200"
                : "border-red-200"
              : "border-slate-200"
          }`}
        >
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

          <h1 className="mt-6 break-words text-2xl font-bold leading-9 text-slate-900 sm:text-3xl sm:leading-10">
            {currentQuestion.question}
          </h1>

          {/* FLASHCARD */}
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
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Answer
                    </p>

                    <p className="mt-3 break-words text-base font-semibold leading-7 text-slate-900 sm:text-lg">
                      {currentQuestion.answer}
                    </p>
                  </div>

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

          {/* MULTIPLE CHOICE */}
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

                      <span className="min-w-0 break-words pt-1 leading-6">
                        {option}
                      </span>

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

        {/* BOTTOM CONTROLS */}
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