

"use client";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';

interface MCQQuestion {
  question: string;
  options: string[];
  questionNumber: number;
}

interface ParsedData {
  questions: MCQQuestion[];
  answerKey: { [key: number]: string };
}

// Client-side file parsing functions
function parseMCQContent(text: string): ParsedData {
  // Clean the text to remove null characters and other problematic characters
  const cleanedText = text
    .replace(/\u0000/g, '') // Remove null characters
    .replace(/\u001a/g, '') // Remove substitute characters
    .replace(/\u0003/g, '') // Remove ETX characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // Replace all control characters with spaces
    .trim();
  
  console.log('Original text length:', text.length);
  console.log('Cleaned text preview:', cleanedText.substring(0, 500) + '...');
  
  // Check if content is on a single line and needs smart splitting
  let lines = cleanedText.split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  
  // If we only have 1 line, it means everything is concatenated - split it intelligently
  if (lines.length === 1) {
    console.log('Content is on single line, splitting intelligently...');
    const singleLine = lines[0];
    
    // Split on question numbers and section markers more carefully
    const smartSplit = singleLine
      .replace(/(\d+\.\s+)/g, '\n$1') // Split before question numbers
      .replace(/([A-D]\)\s+)/g, '\n$1') // Split before options
      .replace(/(ANSWER\s+KEY)/gi, '\n$1') // Split before answer key
      .replace(/(REASONING)/gi, '\n$1') // Split before reasoning section
      .replace(/(GENERAL\s+KNOWLEDGE)/gi, '\n$1') // Split before general knowledge section
      .replace(/(QUANTITATIVE\s+APTITUDE)/gi, '\n$1') // Split before quantitative section
      .replace(/(LOGICAL\s+REASONING)/gi, '\n$1') // Split before logical reasoning
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
    
    lines = smartSplit;
    console.log('After smart splitting, lines:', lines.length);
  }
  
  const questions: MCQQuestion[] = [];
  const answerKey: { [key: number]: string } = {};
  let currentQuestion: Partial<MCQQuestion> = {};
  let inAnswerKeySection = false;
  let currentOptions: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // Check if we've reached the answer key section
    if (/answer\s*key/i.test(line)) {
      inAnswerKeySection = true;
      // Save any pending question before processing answer key
      if (currentQuestion.question && currentOptions.length >= 4) {
        questions.push({
          question: currentQuestion.question,
          options: currentOptions.slice(0, 4),
          questionNumber: currentQuestion.questionNumber || questions.length + 1
        });
      }
      currentQuestion = {};
      currentOptions = [];
      continue;
    }
    
    if (inAnswerKeySection) {
      // Parse answer key entries
      const answerMatch = line.match(/(?:Q?\s*)?(\d+)[\s\.\:\-]*([A-D])/i);
      if (answerMatch) {
        const qNum = parseInt(answerMatch[1]);
        const answer = answerMatch[2].toUpperCase();
        if (!answerKey[qNum]) { // Prevent duplicates
          answerKey[qNum] = answer;
        }
      }
      continue;
    }
    
    // Parse questions and options
    const questionMatch = line.match(/^(\d+)\.\s*(.+)/);
    if (questionMatch) {
      // Save previous question if it exists and has enough options
      if (currentQuestion.question && currentOptions.length >= 4) {
        questions.push({
          question: currentQuestion.question,
          options: currentOptions.slice(0, 4),
          questionNumber: currentQuestion.questionNumber || questions.length + 1
        });
      }
      
      // Start new question
      currentQuestion = {
        questionNumber: parseInt(questionMatch[1]),
        question: questionMatch[2].trim()
      };
      currentOptions = [];
      continue;
    }
    
    // Parse options
    const optionMatch = line.match(/^([A-D])\)\s*(.+)/i);
    if (optionMatch && currentQuestion.question) {
      currentOptions.push(optionMatch[2].trim());
      continue;
    }
    
    // If it's not a question start or option, it might be a continuation of the question
    if (currentQuestion.question && !optionMatch && currentOptions.length === 0) {
      currentQuestion.question += ' ' + line;
    }
  }
  
  // Don't forget the last question
  if (currentQuestion.question && currentOptions.length >= 4) {
    questions.push({
      question: currentQuestion.question,
      options: currentOptions.slice(0, 4),
      questionNumber: currentQuestion.questionNumber || questions.length + 1
    });
  }
  
  // Filter questions to ensure we only have valid ones and renumber them consecutively
  const validQuestions = questions.filter(q => q.options.length === 4).slice(0, 30);
  
  // Renumber questions consecutively to avoid gaps
  const renumberedQuestions = validQuestions.map((q, index) => ({
    ...q,
    questionNumber: index + 1
  }));
  
  // Renumber answer key to match the new question numbers
  const renumberedAnswerKey: { [key: number]: string } = {};
  validQuestions.forEach((q, index) => {
    const originalNumber = q.questionNumber;
    const newNumber = index + 1;
    if (answerKey[originalNumber]) {
      renumberedAnswerKey[newNumber] = answerKey[originalNumber];
    }
  });
  
  console.log('Parsed questions:', renumberedQuestions.length);
  console.log('Parsed answer key entries:', Object.keys(renumberedAnswerKey).length);
  
  return { questions: renumberedQuestions, answerKey: renumberedAnswerKey };
}

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // For PDF files, show a helpful error message
    throw new Error('PDF files are not supported in the static version. Please convert your PDF to a text file (.txt) and upload that instead. You can copy and paste the content from your PDF into a .txt file.');
  } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    // Handle text files
    return await file.text();
  } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    // For Word documents, we'll read as text (basic implementation)
    const text = await file.text();
    return text;
  } else {
    throw new Error('Unsupported file type. Please use TXT files for best results, or DOC/DOCX files.');
  }
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
    
    try {
      console.log('Extracting text from file:', file.name);
      const extractedText = await extractTextFromFile(file);
      
      console.log('Parsing MCQ content...');
      const parsedData = parseMCQContent(extractedText);
      
      if (parsedData.questions.length === 0) {
        throw new Error('No MCQ questions found. Please ensure your file contains questions ending with "?" followed by options A), B), C), D) and an answer key section.');
      }
      
      setQuestions(parsedData.questions);
      
      // Store quiz data in localStorage
      const quizData = {
        questions: parsedData.questions,
        answerKey: parsedData.answerKey,
        totalQuestions: parsedData.questions.length
      };
      
      console.log('Storing quiz data in localStorage:', quizData);
      localStorage.setItem('quizData', JSON.stringify(quizData));
      console.log('Quiz data stored, redirecting to quiz page');
      router.push('/quiz');
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process the file. Please check the file format and try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header with Animation */}
      <div className="text-center mb-12 relative z-10">
        <div className="inline-flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce">
            Q
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-pulse">
            MCQ Quiz Application
          </h1>
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce delay-500">
            🧠
          </div>
        </div>
        <p className="text-blue-200 text-lg animate-fadeIn">
          Transform your documents into interactive quizzes instantly!
        </p>
      </div>
      
      <div className="bg-white/95 backdrop-blur-sm border border-white/20 p-8 rounded-3xl mb-8 max-w-3xl shadow-2xl transform hover:scale-105 transition-all duration-300 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">📋</span>
          </div>
          <h3 className="font-bold text-gray-900 text-xl">File Format Requirements:</h3>
        </div>
        <ul className="text-gray-700 space-y-3">
          <li className="flex items-start transform hover:translate-x-2 transition-transform duration-200">
            <span className="text-green-500 font-bold mr-3 text-lg">✓</span>
            <span><strong>Supports:</strong> TXT files (recommended), DOC, DOCX files</span>
          </li>
          <li className="flex items-start transform hover:translate-x-2 transition-transform duration-200">
            <span className="text-orange-500 font-bold mr-3 text-lg">⚠️</span>
            <span><strong>PDF files:</strong> Please convert to TXT format first</span>
          </li>
          <li className="flex items-start transform hover:translate-x-2 transition-transform duration-200">
            <span className="text-blue-500 font-bold mr-3 text-lg">❓</span>
            <span><strong>Questions</strong> should end with "?"</span>
          </li>
          <li className="flex items-start transform hover:translate-x-2 transition-transform duration-200">
            <span className="text-purple-500 font-bold mr-3 text-lg">📝</span>
            <span><strong>Options</strong> should be formatted as A) Option 1, B) Option 2, etc.</span>
          </li>
          <li className="flex items-start transform hover:translate-x-2 transition-transform duration-200">
            <span className="text-indigo-500 font-bold mr-3 text-lg">🔑</span>
            <span>Include an <strong>"Answer Key"</strong> section at the end</span>
          </li>
          <li className="flex items-start transform hover:translate-x-2 transition-transform duration-200">
            <span className="text-pink-500 font-bold mr-3 text-lg">📊</span>
            <span><strong>Answer key format:</strong> "1. A" or "Q1: B" etc.</span>
          </li>
        </ul>
      </div>
      
      <form onSubmit={handleUpload} className="mb-8 flex flex-col items-center gap-6 relative z-10">
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/30">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <input 
                type="file" 
                name="file" 
                accept=".txt,.doc,.docx" 
                className="w-full border-2 border-dashed border-purple-300 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl text-gray-900 font-medium file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gradient-to-r file:from-blue-500 file:to-purple-500 file:text-white hover:file:from-blue-600 hover:file:to-purple-600 transition-all duration-300 cursor-pointer hover:border-purple-400"
              />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-ping"></div>
            </div>
            <p className="text-sm text-gray-600 text-center font-medium">
              🎯 Supported formats: TXT (recommended), DOC, DOCX
            </p>
          </div>
        </div>
        <button 
          type="submit" 
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 rounded-2xl text-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 shadow-2xl transform hover:scale-105 disabled:hover:scale-100 relative overflow-hidden" 
          disabled={loading}
        >
          <span className="relative z-10">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing File...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span>🚀</span>
                Upload File
                <span>✨</span>
              </div>
            )}
          </span>
          {!loading && (
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-yellow-500 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
          )}
        </button>
      </form>
      
      {error && (
        <div className="bg-red-500/90 backdrop-blur-sm border-2 border-red-300 text-white p-6 rounded-2xl mb-4 max-w-2xl text-center font-medium shadow-2xl animate-shake relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl">⚠️</span>
            <span className="font-bold">Error</span>
          </div>
          {error}
        </div>
      )}
      
      {questions.length > 0 && (
        <div className="w-full max-w-4xl relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400 mb-2">
              🎉 Quiz Ready!
            </h2>
            <p className="text-green-200 text-lg">Found {questions.length} questions in your file</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {questions.slice(0, 3).map((q, i) => (
              <div key={i} className="bg-white/95 backdrop-blur-sm border-2 border-white/30 p-6 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-3xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {q.questionNumber}
                  </div>
                  <p className="font-bold text-gray-900 text-lg leading-tight">{q.question}</p>
                </div>
                <div className="space-y-2">
                  {q.options.map((option, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200">
                      <span className="font-bold text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center text-sm">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-gray-800 font-medium">{option}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {questions.length > 3 && (
            <div className="text-center mt-8 p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl backdrop-blur-sm border border-white/20">
              <p className="text-white font-bold text-xl mb-2">
                ... and {questions.length - 3} more questions await! 🎯
              </p>
              <p className="text-blue-200">Click "Start Quiz" to begin your challenge!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
