"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';

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
        setTimeRemaining(parsedData.totalQuestions * 60); // 1 minute per question
        
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
          <p className="text-gray-600">Please upload a PDF first.</p>
          <a href="/" className="text-blue-600 hover:underline">Go back to upload</a>
        </div>
      </div>
    );
  }

  if (quizSubmitted && results.length > 0 && scoreData) {
    const percentage = Math.round((scoreData.score / scoreData.maxScore) * 100);
    
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Quiz Results</h1>
            <p className="text-gray-600">Here's how you performed</p>
          </div>
          
          {!showDetailedResults ? (
            // Summary View
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Score Overview */}
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-blue-600 mb-2">{percentage}%</div>
                <div className="text-xl text-gray-700">Your Score: {scoreData.score} / {scoreData.maxScore}</div>
              </div>
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{scoreData.totalQuestions}</div>
                  <div className="text-sm font-medium text-gray-700">Total Questions</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{scoreData.attempted}</div>
                  <div className="text-sm font-medium text-gray-700">Attempted</div>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <div className="text-3xl font-bold text-emerald-600">{scoreData.correct}</div>
                  <div className="text-sm font-medium text-gray-700">Correct</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{scoreData.incorrect}</div>
                  <div className="text-sm font-medium text-gray-700">Wrong</div>
                </div>
              </div>
              
              {/* Performance Message */}
              <div className="text-center mb-8">
                <div className={`inline-block px-6 py-3 rounded-lg text-lg font-semibold ${
                  percentage >= 80 ? 'bg-green-100 text-green-800' :
                  percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
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
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  View Detailed Results
                </button>
                <a 
                  href="/" 
                  className="bg-gray-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Take Another Quiz
                </a>
              </div>
            </div>
          ) : (
            // Detailed Results View
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detailed Analysis</h2>
                <button 
                  onClick={() => setShowDetailedResults(false)}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Back to Summary
                </button>
              </div>
              
              <div className="space-y-6">
                {results.map((result, index) => (
                  <div key={index} className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${
                    !result.isAttempted ? 'border-gray-400' : 
                    result.isCorrect ? 'border-green-500' : 'border-red-500'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Q{result.questionNumber}. {result.question}</h3>
                      <div className={`px-3 py-1 rounded text-sm font-medium ${
                        !result.isAttempted ? 'bg-gray-100 text-gray-700' :
                        result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {!result.isAttempted ? 'Not Attempted' : 
                         result.isCorrect ? '+2 marks' : '-0.5 marks'}
                        {result.isMarkedForReview && ' (Reviewed)'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Options:</h4>
                        <div className="space-y-2">
                          {result.options.map((option, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isUserAnswer = result.userAnswer === letter;
                            const isCorrectAnswer = result.correctAnswer === letter;
                            
                            return (
                              <div key={idx} className={`p-3 rounded text-sm border ${
                                isCorrectAnswer ? 'bg-green-50 border-green-300 text-green-900' :
                                isUserAnswer && !isCorrectAnswer ? 'bg-red-50 border-red-300 text-red-900' :
                                'bg-gray-50 border-gray-200 text-gray-800'
                              }`}>
                                <span className="font-semibold">{letter})</span> {option}
                                {isCorrectAnswer && <span className="ml-2 text-green-700 font-semibold">✓ Correct</span>}
                                {isUserAnswer && !isCorrectAnswer && <span className="ml-2 text-red-700 font-semibold">✗ Your Answer</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 rounded">
                          <span className="font-semibold text-gray-900">Your Answer: </span>
                          <span className={`font-medium ${result.isAttempted ? (result.isCorrect ? 'text-green-700' : 'text-red-700') : 'text-gray-600'}`}>
                            {result.userAnswer || 'Not Attempted'}
                          </span>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <span className="font-semibold text-gray-900">Correct Answer: </span>
                          <span className="font-medium text-green-700">{result.correctAnswer}</span>
                        </div>
                        {result.isMarkedForReview && (
                          <div className="p-3 bg-purple-50 rounded">
                            <span className="font-semibold text-purple-700">🔖 Marked for Review</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 text-center">
                <a 
                  href="/" 
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Take Another Quiz
                </a>
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
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {!quizStarted ? (
          // Quiz Setup Page
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8 text-gray-800">Quiz Setup</h1>
            
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
              <div className="mb-6">
                <div className="text-lg text-gray-700 mb-2">Total Questions:</div>
                <div className="text-3xl font-bold text-blue-600">{quizData.questions.length}</div>
              </div>
              
              <div className="mb-8">
                <label className="block font-medium text-gray-700 mb-3">Quiz Duration:</label>
                <div className="flex items-center justify-center gap-2">
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
                    className="border-2 rounded-lg px-4 py-2 w-20 text-center text-lg font-semibold"
                  />
                  <span className="text-lg text-gray-700 font-medium">minutes</span>
                </div>
                <div className="text-sm text-gray-600 mt-2 font-medium">
                  Recommended: {quizData.questions.length * 2} minutes
                </div>
              </div>
              
              <button 
                onClick={startQuiz}
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-semibold hover:bg-green-700 transition-colors w-full"
              >
                Start Quiz
              </button>
            </div>
          </div>
        ) : (
          // Quiz Questions Page
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">MCQ Quiz</h1>
              
              {/* Quiz Status and Timer */}
              <div className="text-right space-y-2">
                <div className={`text-2xl font-bold ${timeRemaining < 60 ? 'text-red-600' : timeRemaining < 300 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-sm text-gray-800 font-medium">
                  <span className="text-green-600">Answered: {answeredCount}</span> | 
                  <span className="text-purple-600"> Review: {reviewCount}</span> | 
                  <span className="text-blue-600"> Visited: {visitedCount}</span> | 
                  <span className="text-gray-600"> Unvisited: {unvisitedCount}</span>
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6 border">
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
                    className="bg-red-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  // Show Save and Next button on all other questions
                  <button 
                    onClick={saveAndNext}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Save and Next
                  </button>
                )}
                
                <button 
                  onClick={markForReview}
                  disabled={!answers[quizData.questions[currentQuestionIndex].questionNumber]}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    !answers[quizData.questions[currentQuestionIndex].questionNumber]
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {markedForReview.has(quizData.questions[currentQuestionIndex].questionNumber) 
                    ? 'Remove Review Mark' 
                    : 'Mark for Review'
                  }
                </button>
                
                <button 
                  onClick={clearAnswer}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  disabled={!answers[quizData.questions[currentQuestionIndex].questionNumber]}
                >
                  Clear Answer
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
    <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${isAnswered ? 'border-green-500' : 'border-gray-300'} ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isAnswered ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-800'}`}>
          {isAnswered ? '✓' : question.questionNumber}
        </div>
        <h3 className="text-lg font-semibold flex-1 text-gray-900">
          {question.questionNumber}. {question.question}
        </h3>
      </div>
      
      <div className="ml-9 space-y-3">
        {question.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          return (
            <label key={index} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              answer === letter 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
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
              <span className="flex-1 text-gray-800">
                <span className="font-semibold text-gray-900">{letter})</span> {option}
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}