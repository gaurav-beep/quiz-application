

"use client";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';

interface MCQQuestion {
  question: string;
  options: string[];
  questionNumber: number;
}

export default function Home() {
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setQuestions([]);
    const form = e.currentTarget;
    const fileInput = form.file as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
      setError("Please select a file.");
      setLoading(false);
      return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions);
        // Store quiz data in localStorage instead of URL to avoid URI malformed errors
        const quizData = {
          questions: data.questions,
          answerKey: data.answerKey,
          totalQuestions: data.totalQuestions
        };
        console.log('Storing quiz data in localStorage:', quizData);
        localStorage.setItem('quizData', JSON.stringify(quizData));
        console.log('Quiz data stored, redirecting to quiz page');
        router.push('/quiz');
      } else {
        setError(data.error || "Failed to extract questions.");
      }
    } catch (err) {
      setError("Failed to upload file.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8 text-white">MCQ Quiz Application</h1>
      
      <div className="bg-white border-2 border-gray-300 p-6 rounded-lg mb-8 max-w-2xl shadow-lg">
        <h3 className="font-bold text-gray-900 mb-3 text-lg">File Format Requirements:</h3>
        <ul className="text-gray-800 space-y-2">
          <li className="flex items-start"><span className="text-blue-600 font-bold mr-2">•</span>Supports: PDF, TXT, DOC, DOCX files</li>
          <li className="flex items-start"><span className="text-blue-600 font-bold mr-2">•</span>Questions should end with "?"</li>
          <li className="flex items-start"><span className="text-blue-600 font-bold mr-2">•</span>Options should be formatted as A) Option 1, B) Option 2, etc.</li>
          <li className="flex items-start"><span className="text-blue-600 font-bold mr-2">•</span>Include an "Answer Key" section at the end</li>
          <li className="flex items-start"><span className="text-blue-600 font-bold mr-2">•</span>Answer key format: "1. A" or "Q1: B" etc.</li>
        </ul>
      </div>
      
      <form onSubmit={handleUpload} className="mb-8 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <input 
            type="file" 
            name="file" 
            accept=".pdf,.txt,.doc,.docx" 
            className="border-2 border-gray-400 bg-white p-3 rounded-lg text-gray-900 font-medium file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-sm text-gray-400 text-center">
            Supported formats: PDF, TXT, DOC, DOCX
          </p>
        </div>
        <button 
          type="submit" 
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50" 
          disabled={loading}
        >
          {loading ? "Processing File..." : "Upload File"}
        </button>
      </form>
      
      {error && (
        <div className="bg-red-100 border-2 border-red-400 text-red-800 p-4 rounded-lg mb-4 max-w-2xl text-center font-medium">
          {error}
        </div>
      )}
      
      {questions.length > 0 && (
        <div className="w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-6 text-white text-center">Extracted MCQ Questions</h2>
          <div className="space-y-6">
            {questions.slice(0, 3).map((q, i) => (
              <div key={i} className="bg-white border-2 border-gray-300 p-6 rounded-lg shadow-lg">
                <p className="font-bold text-gray-900 mb-4 text-lg">{q.questionNumber}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((option, idx) => (
                    <p key={idx} className="text-gray-800 font-medium">
                      <span className="font-bold text-blue-600">{String.fromCharCode(65 + idx)})</span> {option}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {questions.length > 3 && (
              <p className="text-center text-gray-300 font-medium text-lg">
                ... and {questions.length - 3} more questions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
