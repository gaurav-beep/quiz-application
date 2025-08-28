

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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8 text-white">MCQ Quiz Application</h1>
      
      <div className="bg-white border-2 border-gray-300 p-6 rounded-lg mb-8 max-w-2xl shadow-lg">
        <h3 className="font-bold text-gray-900 mb-3 text-lg">File Format Requirements:</h3>
        <ul className="text-gray-800 space-y-2">
          <li className="flex items-start"><span className="text-blue-600 font-bold mr-2">•</span>Supports: TXT files (recommended), DOC, DOCX files</li>
          <li className="flex items-start"><span className="text-red-600 font-bold mr-2">•</span>PDF files: Please convert to TXT format first</li>
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
            accept=".txt,.doc,.docx" 
            className="border-2 border-gray-400 bg-white p-3 rounded-lg text-gray-900 font-medium file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-sm text-gray-400 text-center">
            Supported formats: TXT (recommended), DOC, DOCX
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
