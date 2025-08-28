# MCQ Quiz Application

A modern, interactive multiple-choice question (MCQ) quiz application built with Next.js, TypeScript, and Tailwind CSS. The application allows users to upload PDF files containing MCQ questions and take timed quizzes with advanced navigation features.

## Features

### 📚 Multi-Format File Upload & Parsing
- Upload files in multiple formats: **PDF**, **TXT**, **DOC**, **DOCX**
- Automatic file type detection and text extraction
- Support for various question formats
- Robust error handling for different file types

### 🎯 Interactive Quiz Interface
- Single-question view with clean, focused layout
- Color-coded navigation system:
  - **Gray**: Unvisited questions
  - **Blue**: Visited but unanswered questions
  - **Green**: Answered questions
  - **Orange**: Questions marked for review
- Mark questions for review functionality
- Clear answer option for each question

### ⏱️ Timer & Navigation
- Built-in quiz timer
- Easy navigation between questions
- Quick access to any question via numbered navigation
- Previous/Next question buttons

### 📊 Comprehensive Results
- Detailed scoring system (+2 for correct, -0.5 for wrong)
- Toggle between Summary and Detailed views
- Question-wise analysis showing:
  - Your answers vs correct answers
  - Individual question scores
  - Review status for each question

### 🎨 Modern UI/UX
- Responsive design with Tailwind CSS
- Dark theme with professional styling
- Smooth transitions and hover effects
- Mobile-friendly interface

## Tech Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **PDF Processing**: pdf-parse for PDF files
- **Word Documents**: mammoth for .docx files
- **Text Files**: Native Node.js for .txt files
- **Legacy Support**: Basic text extraction for .doc files
- **Runtime**: React 19.1.0

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd quiz-application
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Upload MCQ File
- Navigate to the homepage
- Click "Choose File" and select your MCQ file (PDF, TXT, DOC, DOCX)
- The file should contain:
  - Questions ending with "?"
  - Options in format A), B), C), D)
  - An answer key section

### 2. Take the Quiz
- Questions are displayed one at a time
- Use navigation buttons or click question numbers to move around
- Mark questions for review if needed
- Clear answers if you want to change them

### 3. View Results
- Complete the quiz to see your results
- Toggle between Summary and Detailed views
- Review your performance question by question

## File Format Requirements

Your file should follow this format (works with PDF, TXT, DOC, DOCX):

```
1. What is the capital of France?
A) London
B) Berlin
C) Paris
D) Madrid

2. Which planet is closest to the Sun?
A) Venus
B) Mercury
C) Earth
D) Mars

ANSWER KEY
1. C
2. B
```

### Supported File Types:
- **PDF** (.pdf) - Portable Document Format
- **Text** (.txt) - Plain text files
- **Word** (.docx) - Modern Word documents
- **Legacy Word** (.doc) - Older Word documents (basic support)

## Sample Quiz

The project includes `IB-SA-2025-Quiz.pdf` - a sample quiz with 50 questions covering:
- **Quantitative Aptitude** (25 questions)
  - Number System & Simplification
  - Percentages & Averages
  - Profit, Loss & Discount
  - Simple & Compound Interest
  - Ratio, Proportion & Partnership
  - Time, Speed & Distance; Time & Work
  - Mensuration & Geometry
  - Mixture & Alligation
  - Data Interpretation
  - Probability, Permutation & Combination

- **Reasoning/Logical Ability** (25 questions)
  - Coding-Decoding
  - Blood Relations
  - Syllogism
  - Direction & Distance
  - Series (Numbers/Alphabet)
  - Classification/Odd one out
  - Puzzles & Arrangements
  - Mirror/Water Images
  - Data Sufficiency
  - Venn Diagrams

## Project Structure

```
quiz-application/
├── src/
│   ├── app/
│   │   ├── api/upload/route.ts    # Multi-format file parsing API
│   │   ├── quiz/page.tsx          # Main quiz interface
│   │   ├── page.tsx               # Upload page
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # Global styles
├── public/                        # Static assets
├── IB-SA-2025-Quiz.pdf           # Main quiz PDF (50 questions)
├── test-quiz.txt                  # Sample text file for testing
├── IB_SA_2025_Syllabus_Weightage.pdf # Reference syllabus
├── package.json                   # Dependencies & scripts
├── README.md                      # Documentation
└── [Next.js config files]         # TypeScript, ESLint, etc.
```

## Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ using Next.js and TypeScript
