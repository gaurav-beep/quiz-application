"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface MCQQuestion {
  question: string;
  options: string[];
  questionNumber: number;
}

interface QuizData {
  questions: MCQQuestion[];
  answerKey: { [key: number]: string };
  totalQuestions: number;
}

interface QuizResult {
  questionNumber: number;
  question: string;
  options: string[];
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  isAttempted: boolean;
  isMarkedForReview?: boolean;
}

interface ScoreData {
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
}

function QuizContent() {
  const searchParams = useSearchParams();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<{[key: number]: string}>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [showAllQuestions, setShowAllQuestions] = useState<boolean>(false);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [totalTimeLimit, setTotalTimeLimit] = useState<number>(30); // Default 30 minutes
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set());
  const [showDetailedResults, setShowDetailedResults] = useState<boolean>(false);

  useEffect(() => {
    // First try to get data from localStorage
    console.log('Quiz page loading, checking localStorage...');
    const storedData = localStorage.getItem('quizData');
    console.log('Stored data from localStorage:', storedData);
    
    if (storedData) {
      try {
        console.log('Loading quiz data from localStorage');
        const parsedData: QuizData = JSON.parse(storedData);
        console.log('Parsed data:', parsedData);
        
        setQuizData(parsedData);
        setCurrentQuestionIndex(0); // Start with first question (index 0)
        
        // Set default time (2 minutes per question)
        const defaultTime = parsedData.questions.length * 2;
        setTotalTimeLimit(defaultTime);
        setTimeRemaining(defaultTime * 60); // Convert minutes to seconds
        
        // Clear the stored data after loading
        localStorage.removeItem('quizData');
        console.log('Quiz data loaded successfully and localStorage cleared');
        return;
      } catch (error) {
        console.error('Error parsing stored quiz data:', error);
      }
    }
    
    // Fallback: try to get data from URL parameters (for backward compatibility)
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        console.log('Raw data param:', dataParam);
        const decodedData = decodeURIComponent(dataParam);
        console.log('Decoded data:', decodedData);
        
        // Clean up any malformed Unicode sequences
        const cleanedData = decodedData.replace(/\\u0000/g, '').replace(/\u0000/g, '');
        console.log('Cleaned data:', cleanedData);
        
        const parsedData: QuizData = JSON.parse(cleanedData);
        console.log('Parsed data:', parsedData);
        
        setQuizData(parsedData);
        // Set default time (2 minutes per question)
        const defaultTime = parsedData.questions.length * 2;
        setTotalTimeLimit(defaultTime);
        setTimeRemaining(defaultTime * 60);
      } catch (error) {
        console.error('Error parsing quiz data:', error);
        console.error('Failed data param:', dataParam);
      }
    }
  }, [searchParams]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (quizStarted && timerActive && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizStarted, timerActive, isPaused, timeRemaining]);

  const startQuiz = () => {
    setQuizStarted(true);
    setTimerActive(true);
    setIsPaused(false);
  };

  const handleAnswerChange = (questionNumber: number, answer: string) => {
    if (!quizStarted) return; // Only allow answers after quiz starts
    setAnswers(prev => ({ ...prev, [questionNumber]: answer }));
    setVisitedQuestions(prev => new Set([...prev, questionNumber]));
  };

  const calculateResults = (): { results: QuizResult[], scoreData: ScoreData } => {
    if (!quizData) return { results: [], scoreData: { totalQuestions: 0, attempted: 0, correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0 } };

    console.log('Calculating results...');
    console.log('Total questions in quizData:', quizData.questions.length);
    console.log('Answers object:', answers);
    console.log('Answer key:', quizData.answerKey);

    const results: QuizResult[] = quizData.questions.map(q => {
      const userAnswer = answers[q.questionNumber] || null;
      const correctAnswer = quizData.answerKey[q.questionNumber] || '';
      const isMarkedForReview = markedForReview.has(q.questionNumber);
      
      // Consider a question attempted if it has an answer, regardless of review status
      const isAttempted = userAnswer !== null;
      const isCorrect = isAttempted && userAnswer === correctAnswer;

      console.log(`Q${q.questionNumber}: attempted=${isAttempted}, userAnswer=${userAnswer}, correctAnswer=${correctAnswer}`);

      return {
        questionNumber: q.questionNumber,
        question: q.question,
        options: q.options,
        userAnswer,
        correctAnswer,
        isCorrect,
        isAttempted,
        isMarkedForReview // Add this for result display
      };
    });

    const attempted = results.filter(r => r.isAttempted).length;
    const correct = results.filter(r => r.isCorrect).length;
    const incorrect = results.filter(r => r.isAttempted && !r.isCorrect).length;
    const unattempted = results.filter(r => !r.isAttempted).length;
    
    console.log('Results summary:');
    console.log('Total questions:', quizData.questions.length);
    console.log('Attempted:', attempted);
    console.log('Correct:', correct);
    console.log('Incorrect:', incorrect);
    console.log('Unattempted:', unattempted);
    
    // Scoring: +2 for correct, -0.5 for incorrect, 0 for unattempted
    const score = (correct * 2) + (incorrect * -0.5);
    const maxScore = quizData.questions.length * 2;

    const scoreData: ScoreData = {
      totalQuestions: quizData.questions.length,
      attempted,
      correct,
      incorrect,
      unattempted,
      score,
      maxScore
    };

    return { results, scoreData };
  };

  const handleSubmitQuiz = () => {
    setTimerActive(false);
    setQuizSubmitted(true);
    const { results, scoreData } = calculateResults();
    setResults(results);
    setScoreData(scoreData);
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowAllQuestions(false);
    // Mark question as visited when navigating to it
    const questionNumber = quizData?.questions[index]?.questionNumber;
    if (questionNumber) {
      setVisitedQuestions(prev => new Set([...prev, questionNumber]));
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (quizData?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const markForReview = () => {
    const questionNumber = quizData?.questions[currentQuestionIndex]?.questionNumber;
    if (questionNumber && answers[questionNumber]) {
      // Only allow marking for review if question has an answer
      setMarkedForReview(prev => {
        const newSet = new Set(prev);
        if (newSet.has(questionNumber)) {
          newSet.delete(questionNumber);
        } else {
          newSet.add(questionNumber);
        }
        return newSet;
      });
    }
  };

  const clearAnswer = () => {
    const questionNumber = quizData?.questions[currentQuestionIndex]?.questionNumber;
    if (questionNumber) {
      // Remove answer
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionNumber];
        return newAnswers;
      });
      
      // Remove from visited questions (make it unvisited)
      setVisitedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionNumber);
        return newSet;
      });
      
      // Remove from marked for review if it was marked
      setMarkedForReview(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionNumber);
        return newSet;
      });
    }
  };

  const saveAndNext = () => {
    // Question is already saved when answered, just move to next
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < (quizData?.questions.length || 0)) {
      setCurrentQuestionIndex(nextIndex);
      // Mark next question as visited
      const nextQuestionNumber = quizData?.questions[nextIndex]?.questionNumber;
      if (nextQuestionNumber) {
        setVisitedQuestions(prev => new Set([...prev, nextQuestionNumber]));
      }
    }
  };

  const toggleViewMode = () => {
    setShowAllQuestions(prev => !prev);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!quizData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Quiz Data Found</h1>
          <p className="text-gray-600">Please upload a file first.</p>
          <button 
            onClick={() => {
              window.location.href = 'https://gaurav-beep.github.io/quiz-application/';
            }}
            className="text-blue-600 hover:underline bg-transparent border-none cursor-pointer"
          >
            Go back to upload
          </button>
        </div>
      </div>
    );
  }

  if (quizSubmitted && results.length > 0 && scoreData) {
    const percentage = Math.round((scoreData.score / scoreData.maxScore) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-8 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">🏆 Quiz Results</h1>
            <p className="text-green-200">Here's how you performed</p>
          </div>
          
          {!showDetailedResults ? (
            // Summary View
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8 hover:shadow-3xl transition-all duration-300">
              {/* Score Overview */}
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2 animate-pulse">{percentage}%</div>
                <div className="text-xl text-green-100">Your Score: {scoreData.score} / {scoreData.maxScore}</div>
              </div>
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105">
                  <div className="text-3xl font-bold text-green-300">{scoreData.totalQuestions}</div>
                  <div className="text-sm font-medium text-green-100">Total Questions</div>
                </div>
                <div className="text-center p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105">
                  <div className="text-3xl font-bold text-emerald-300">{scoreData.attempted}</div>
                  <div className="text-sm font-medium text-emerald-100">Attempted</div>
                </div>
                <div className="text-center p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105">
                  <div className="text-3xl font-bold text-teal-300">{scoreData.correct}</div>
                  <div className="text-sm font-medium text-teal-100">Correct</div>
                </div>
                <div className="text-center p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105">
                  <div className="text-3xl font-bold text-red-300">{scoreData.incorrect}</div>
                  <div className="text-sm font-medium text-red-100">Wrong</div>
                </div>
              </div>
              
              {/* Performance Message */}
              <div className="text-center mb-8">
                <div className={`inline-block px-6 py-3 rounded-xl text-lg font-semibold backdrop-blur-sm border transition-all duration-300 transform hover:scale-105 ${
                  percentage >= 80 ? 'bg-green-500/20 text-green-200 border-green-400/30' :
                  percentage >= 60 ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30' :
                  'bg-red-500/20 text-red-200 border-red-400/30'
                }`}>
                  {percentage >= 80 ? '🎉 Excellent Performance!' :
                   percentage >= 60 ? '👍 Good Job!' :
                   '💪 Keep Practicing!'}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setShowDetailedResults(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  📊 View Detailed Results
                </button>
                <button 
                  onClick={() => {
                    window.location.href = 'https://gaurav-beep.github.io/quiz-application/';
                  }}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-green-100 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  🔄 Take Another Quiz
                </button>
              </div>
            </div>
          ) : (
            // Detailed Results View
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">📋 Detailed Analysis</h2>
                <button 
                  onClick={() => setShowDetailedResults(false)}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-green-100 px-6 py-2 rounded-xl font-medium hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  ← Back to Summary
                </button>
              </div>
              
              <div className="space-y-6">
                {results.map((result, index) => (
                  <div key={index} className={`bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-l-4 ${
                    !result.isAttempted ? 'border-l-gray-400' : 
                    result.isCorrect ? 'border-l-green-400' : 'border-l-red-400'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-green-100">Q{result.questionNumber}. {result.question}</h3>
                      <div className={`px-3 py-1 rounded-xl text-sm font-medium backdrop-blur-sm border ${
                        !result.isAttempted ? 'bg-gray-500/20 text-gray-200 border-gray-400/30' :
                        result.isCorrect ? 'bg-green-500/20 text-green-200 border-green-400/30' : 'bg-red-500/20 text-red-200 border-red-400/30'
                      }`}>
                        {!result.isAttempted ? 'Not Attempted' : 
                         result.isCorrect ? '+2 marks' : '-0.5 marks'}
                        {result.isMarkedForReview && ' (Reviewed)'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-green-200 mb-2">Options:</h4>
                        <div className="space-y-2">
                          {result.options.map((option, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isUserAnswer = result.userAnswer === letter;
                            const isCorrectAnswer = result.correctAnswer === letter;
                            
                            return (
                              <div key={idx} className={`p-3 rounded-xl text-sm border backdrop-blur-sm ${
                                isCorrectAnswer ? 'bg-green-500/20 border-green-400/30 text-green-200' :
                                isUserAnswer && !isCorrectAnswer ? 'bg-red-500/20 border-red-400/30 text-red-200' :
                                'bg-white/10 border-white/20 text-green-100'
                              }`}>
                                <span className="font-semibold">{letter})</span> {option}
                                {isCorrectAnswer && <span className="ml-2 text-green-300 font-semibold">✓ Correct</span>}
                                {isUserAnswer && !isCorrectAnswer && <span className="ml-2 text-red-300 font-semibold">✗ Your Answer</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
                          <span className="font-semibold text-green-200">Your Answer: </span>
                          <span className={`font-medium ${result.isAttempted ? (result.isCorrect ? 'text-green-300' : 'text-red-300') : 'text-gray-300'}`}>
                            {result.userAnswer || 'Not Attempted'}
                          </span>
                        </div>
                        <div className="p-3 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl">
                          <span className="font-semibold text-green-200">Correct Answer: </span>
                          <span className="font-medium text-green-300">{result.correctAnswer}</span>
                        </div>
                        {result.isMarkedForReview && (
                          <div className="p-3 bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-xl">
                            <span className="font-semibold text-purple-300">🔖 Marked for Review</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 text-center">
                <button 
                  onClick={() => {
                    window.location.href = 'https://gaurav-beep.github.io/quiz-application/';
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  🔄 Take Another Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const completedQuestions = new Set(Object.keys(answers).map(Number));
  
  // Calculate counts for header display
  const answeredCount = completedQuestions.size;
  const reviewCount = markedForReview.size;
  const visitedCount = visitedQuestions.size;
  const unvisitedCount = quizData.questions.length - visitedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {!quizStarted ? (
          // Quiz Setup Page
          <div className="text-center">
            <div className="mb-12">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce">
                  🎯
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  Quiz Setup
                </h1>
                <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce delay-500">
                  ⚡
                </div>
              </div>
              <p className="text-purple-200 text-xl">Get ready for your quiz challenge!</p>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm border border-white/20 p-10 rounded-3xl shadow-2xl max-w-lg mx-auto transform hover:scale-105 transition-all duration-300">
              <div className="mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-2xl">📚</span>
                  <div className="text-lg text-gray-700 font-medium">Total Questions:</div>
                </div>
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                  {quizData.questions.length}
                </div>
              </div>
              
              <div className="mb-10">
                <label className="block font-bold text-gray-800 mb-4 text-lg flex items-center justify-center gap-2">
                  <span>⏱️</span> Quiz Duration:
                </label>
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={totalTimeLimit}
                    onChange={(e) => {
                      const newTime = Number(e.target.value);
                      setTotalTimeLimit(newTime);
                      setTimeRemaining(newTime * 60);
                    }}
                    className="border-2 border-purple-300 rounded-xl px-4 py-3 w-24 text-center text-2xl font-bold text-purple-900 bg-white focus:border-purple-500 focus:outline-none shadow-lg"
                  />
                  <span className="text-xl text-gray-700 font-bold">minutes</span>
                </div>
              </div>
              
              <button 
                onClick={startQuiz}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-12 py-5 rounded-2xl text-2xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 w-full shadow-2xl transform hover:scale-105 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <span>🚀</span>
                  Start Quiz Adventure
                  <span>✨</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        ) : (
          // Quiz Questions Page
          <div className="space-y-8">
            {/* Header */}
            <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-3xl shadow-2xl p-6">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    🧠
                  </div>
                  <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    MCQ Quiz Challenge
                  </h1>
                </div>
                
                {/* Quiz Status and Timer */}
                <div className="text-center lg:text-right space-y-3">
                  <div className={`text-4xl font-bold ${timeRemaining < 60 ? 'text-red-500' : timeRemaining < 300 ? 'text-yellow-500' : 'text-green-500'} animate-pulse`}>
                    ⏰ {formatTime(timeRemaining)}
                  </div>
                  <div className="flex flex-wrap justify-center lg:justify-end gap-4 text-sm font-bold">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">✅ Answered: {answeredCount}</span>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">🔍 Review: {reviewCount}</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">👁️ Visited: {visitedCount}</span>
                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full">⚪ Unvisited: {unvisitedCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="flex justify-center">
                {/* Question Overview */}
                <div className="flex gap-2 flex-wrap justify-center">
                  {quizData.questions.map((_, index) => {
                    const questionNumber = index + 1;
                    const isAnswered = completedQuestions.has(questionNumber);
                    const isReviewed = markedForReview.has(questionNumber);
                    const isVisited = visitedQuestions.has(questionNumber);
                    const isCurrent = currentQuestionIndex === index;
                    
                    let buttonClass = 'w-10 h-10 text-sm rounded font-semibold transition-colors ';
                    let title = `Question ${questionNumber}`;
                    
                    if (isReviewed) {
                      // Purple takes priority for review questions
                      buttonClass += 'bg-purple-500 text-white hover:bg-purple-600';
                      title += ' (Marked for Review)';
                    } else if (isAnswered) {
                      // Green for answered questions (only if not marked for review)
                      buttonClass += 'bg-green-500 text-white hover:bg-green-600';
                      title += ' (Answered)';
                    } else if (isVisited && !isAnswered) {
                      // Red for visited but not answered
                      buttonClass += 'bg-red-500 text-white hover:bg-red-600';
                      title += ' (Visited but not answered)';
                    } else if (isCurrent) {
                      // Blue for current question
                      buttonClass += 'bg-blue-500 text-white';
                      title += ' (Current)';
                    } else {
                      // Gray for not visited
                      buttonClass += 'bg-gray-300 text-gray-800 hover:bg-gray-400';
                      title += ' (Not visited)';
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={() => goToQuestion(index)}
                        className={buttonClass}
                        title={title}
                      >
                        {questionNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              <MCQQuestionCard 
                question={quizData.questions[currentQuestionIndex]}
                answer={answers[quizData.questions[currentQuestionIndex].questionNumber]}
                isAnswered={completedQuestions.has(quizData.questions[currentQuestionIndex].questionNumber)}
                onAnswerChange={handleAnswerChange}
                disabled={false}
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-8">
              <div className="flex justify-center gap-4 items-center">
                {currentQuestionIndex === quizData.questions.length - 1 ? (
                  // Show Submit button on last question
                  <button 
                    onClick={handleSubmitQuiz}
                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    🎯 Submit Quiz
                  </button>
                ) : (
                  // Show Save and Next button on all other questions
                  <button 
                    onClick={saveAndNext}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    💾 Save and Next
                  </button>
                )}
                
                <button 
                  onClick={markForReview}
                  disabled={!answers[quizData.questions[currentQuestionIndex].questionNumber]}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    !answers[quizData.questions[currentQuestionIndex].questionNumber]
                      ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed backdrop-blur-sm border border-gray-400/30'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {markedForReview.has(quizData.questions[currentQuestionIndex].questionNumber) 
                    ? '🔖 Remove Review Mark' 
                    : '🔍 Mark for Review'
                  }
                </button>
                
                <button 
                  onClick={clearAnswer}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
                  disabled={!answers[quizData.questions[currentQuestionIndex].questionNumber]}
                >
                  🗑️ Clear Answer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MCQQuestionCardProps {
  question: MCQQuestion;
  answer?: string;
  isAnswered: boolean;
  onAnswerChange: (questionNumber: number, answer: string) => void;
  disabled: boolean;
}

function MCQQuestionCard({ question, answer, isAnswered, onAnswerChange, disabled }: MCQQuestionCardProps) {
  return (
    <div className={`bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-l-4 ${isAnswered ? 'border-l-green-400' : 'border-l-purple-400'} ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isAnswered ? 'bg-green-500 text-white' : 'bg-purple-500 text-white'}`}>
          {isAnswered ? '✓' : question.questionNumber}
        </div>
        <h3 className="text-lg font-semibold flex-1 text-white">
          {question.questionNumber}. {question.question}
        </h3>
      </div>
      
      <div className="ml-9 space-y-3">
        {question.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          return (
            <label key={index} className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 transform hover:scale-[1.02] ${
              answer === letter 
                ? 'bg-blue-500/20 border-blue-400/30 backdrop-blur-sm' 
                : 'bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm'
            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name={`question-${question.questionNumber}`}
                value={letter}
                checked={answer === letter}
                onChange={(e) => onAnswerChange(question.questionNumber, e.target.value)}
                disabled={disabled}
                className="mt-1"
              />
              <span className="flex-1 text-white">
                <span className="font-semibold text-blue-200">{letter})</span> {option}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-purple-400 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
            🚀 Loading Quiz...
          </h2>
          <p className="text-purple-200">Preparing your quiz experience</p>
        </div>
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}