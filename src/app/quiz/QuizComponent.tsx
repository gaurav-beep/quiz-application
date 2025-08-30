import React, { useState } from 'react';

const QuizComponent = () => {
  const questions = [
    {
      question: 'What is the capital of France?',
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      answer: 'Paris',
    },
    {
      question: 'Which planet is known as the Red Planet?',
      options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
      answer: 'Mars',
    },
    {
      question: 'Who wrote "Hamlet"?',
      options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'],
      answer: 'William Shakespeare',
    },
  ];

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (answer: string) => {
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentQuestion] = answer;
    setUserAnswers(updatedAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setUserAnswers([]);
    setShowResults(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-md">
      {!showResults ? (
        <div>
          <h2 className="text-xl font-bold mb-4">
            Question {currentQuestion + 1} of {questions.length}
          </h2>
          <p className="mb-4">{questions[currentQuestion].question}</p>
          <div className="space-y-2">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-4">Quiz Results</h2>
          <ul className="mb-4">
            {questions.map((q, index) => (
              <li key={index} className="mb-2">
                <p>
                  <strong>Q{index + 1}:</strong> {q.question}
                </p>
                <p>
                  <strong>Your Answer:</strong> {userAnswers[index] || 'No answer'}
                </p>
                <p>
                  <strong>Correct Answer:</strong> {q.answer}
                </p>
              </li>
            ))}
          </ul>
          <button
            onClick={restartQuiz}
            className="py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Restart Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;
