import { NextRequest, NextResponse } from 'next/server';
// import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

interface MCQQuestion {
  question: string;
  options: string[];
  questionNumber: number;
}

interface ParsedData {
  questions: MCQQuestion[];
  answerKey: { [key: number]: string };
}

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
      .replace(/(SECTION)/gi, '\n$1') // Split before sections
      .replace(/(\s+REASONING\s+)/gi, '\n$1') // Split before REASONING
      .replace(/(\s+GENERAL\s+KNOWLEDGE\s+)/gi, '\n$1') // Split before GENERAL KNOWLEDGE
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
    
    lines = smartSplit;
    console.log('After smart splitting, lines:', lines.length);
    console.log('Sample split lines around question 21:', smartSplit.slice(80, 100));
  }
  
  console.log('Number of lines to process:', lines.length);
  console.log('First few lines:', lines.slice(0, 10));
  
  const questions: MCQQuestion[] = [];
  const answerKey: { [key: number]: string } = {};
  
  let currentQuestion: Partial<MCQQuestion> = {};
  let isAnswerKeySection = false;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip section headers and titles
    if (line.toUpperCase().includes('SECTION') || 
        line.toUpperCase().includes('QUANTITATIVE') ||
        line.toUpperCase().includes('REASONING') ||
        line.toUpperCase().includes('GENERAL KNOWLEDGE') ||
        line.toUpperCase().includes('PRACTICE TEST') ||
        line.toUpperCase().includes('TOTAL QUESTIONS')) {
      continue;
    }
    
    // Check for answer key section
    if (line.toLowerCase().includes('answer key')) {
      isAnswerKeySection = true;
      continue;
    }
    
    if (isAnswerKeySection) {
      // Parse answer key format like "1. B" or "1) B" 
      const answerMatch = line.match(/^(\d+)[\.\)]\s*([A-D])$/i);
      if (answerMatch) {
        const qNum = parseInt(answerMatch[1]);
        const answer = answerMatch[2].toUpperCase();
        if (qNum <= 30 && !answerKey[qNum]) { // Only accept if not already set (prevent duplicates)
          answerKey[qNum] = answer;
        }
      }
      continue;
    }
    
    // Check if line is a question (numbered and ends with ?)
    const questionMatch = line.match(/^(\d+)\.\s*(.+\?)$/);
    if (questionMatch) {
      // Save previous question if it exists and has 4 options
      if (currentQuestion.question && currentQuestion.options && currentQuestion.options.length === 4) {
        questions.push({
          question: currentQuestion.question,
          options: currentQuestion.options,
          questionNumber: currentQuestion.questionNumber!
        });
      }
      
      // Start new question
      const extractedNumber = parseInt(questionMatch[1]);
      const questionText = questionMatch[2];
      
      // Only process questions 1-30
      if (extractedNumber <= 30) {
        currentQuestion = {
          question: questionText,
          options: [],
          questionNumber: extractedNumber
        };
      }
    }
    // Check if line is an option (starts with A), B), C), D))
    else if (/^[A-D]\)\s*.+/.test(line)) {
      if (currentQuestion.question) {
        if (!currentQuestion.options) currentQuestion.options = [];
        // Extract option text without the letter prefix
        const optionText = line.replace(/^[A-D]\)\s*/, '');
        // Don't add options that contain section headers and limit to 4 options
        if (!optionText.toUpperCase().includes('SECTION') && 
            !optionText.toUpperCase().includes('REASONING') &&
            !optionText.toUpperCase().includes('GENERAL KNOWLEDGE') &&
            currentQuestion.options.length < 4) {
          currentQuestion.options.push(optionText);
        }
      }
    }
  }
  
  // Add the last question if it has exactly 4 options
  if (currentQuestion.question && currentQuestion.options && currentQuestion.options.length === 4) {
    questions.push({
      question: currentQuestion.question,
      options: currentQuestion.options,
      questionNumber: currentQuestion.questionNumber!
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
  console.log('Total questions before filtering:', questions.length);
  console.log('Questions with less than 4 options:', questions.filter(q => q.options.length < 4).map(q => ({
    questionNumber: q.questionNumber,
    question: q.question.substring(0, 50) + '...',
    optionCount: q.options.length,
    options: q.options
  })));
  console.log('Parsed answer key entries:', Object.keys(renumberedAnswerKey).length);
  console.log('Sample question:', renumberedQuestions[0]);
  console.log('Renumbered answer key:', renumberedAnswerKey);
  
  return { questions: renumberedQuestions, answerKey: renumberedAnswerKey };
}

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();
  
  try {
    let extractedText = '';
    
    if (fileName.endsWith('.pdf')) {
      // Handle PDF files with error catching
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        // Fallback: try to read as text
        extractedText = buffer.toString('utf-8');
      }
    } 
    else if (fileName.endsWith('.txt')) {
      // Handle text files
      extractedText = buffer.toString('utf-8');
    }
    else if (fileName.endsWith('.docx')) {
      // Handle Word documents (.docx)
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    }
    else if (fileName.endsWith('.doc')) {
      // Handle older Word documents (.doc) - try as text
      extractedText = buffer.toString('utf-8');
    }
    else {
      // Try to read as text for any other format
      extractedText = buffer.toString('utf-8');
    }
    
    // Clean the extracted text
    return extractedText
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/\u001a/g, '') // Remove substitute characters
      .replace(/\u0003/g, '') // Remove ETX characters
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // Replace all control characters with spaces except newlines
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Convert Mac line endings
      .trim();
      
  } catch (error) {
    console.error(`Error parsing ${fileName}:`, error);
    // Fallback: try to read as plain text and clean it
    const fallbackText = buffer.toString('utf-8');
    return fallbackText
      .replace(/\u0000/g, '')
      .replace(/\u001a/g, '')
      .replace(/\u0003/g, '')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Convert Mac line endings
      .trim();
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  try {
    const text = await extractTextFromFile(file as File);
    const parsedData = parseMCQContent(text);
    
    if (parsedData.questions.length === 0) {
      return NextResponse.json({ 
        error: 'No MCQ questions found. Please ensure your file contains questions ending with "?" followed by options A), B), C), D) and an answer key section.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({
      questions: parsedData.questions,
      answerKey: parsedData.answerKey,
      totalQuestions: parsedData.questions.length
    });
  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json({ error: 'Failed to parse file. Please check the file format and content.' }, { status: 500 });
  }
}
