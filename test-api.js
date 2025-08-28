// Simple test script to verify API functionality
const fs = require('fs');

async function testAPI() {
  try {
    // Test with text file
    const textContent = fs.readFileSync('test-quiz.txt');
    const formData = new FormData();
    const blob = new Blob([textContent], { type: 'text/plain' });
    const file = new File([blob], 'test-quiz.txt', { type: 'text/plain' });
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('API Test Result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Only run if we're in browser environment
if (typeof window !== 'undefined') {
  testAPI();
}
