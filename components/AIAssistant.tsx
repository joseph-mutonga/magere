import React, { useState } from 'react';
import { getAIResponse } from '../services/geminiService';
import * as api from '../services/api';
import { SparklesIcon } from './common/Icons';

const AIAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      // Fetch fresh data from the API to build the context
      const [
        students,
        teachers,
        books,
        libraryTransactions,
        inventory,
        grades
      ] = await Promise.all([
        api.get('/students'),
        api.get('/teachers'),
        api.get('/books'),
        api.get('/library/transactions'),
        api.get('/inventory'),
        api.get('/grades')
      ]);

      const context = {
        students,
        teachers,
        books,
        libraryTransactions,
        inventory,
        grades,
      };
      const aiResponse = await getAIResponse(prompt, context);
      setResponse(aiResponse);
    } catch (err) {
      setError('Failed to get response from AI assistant. Is the API running?');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
      <div className="flex items-center mb-4">
        <SparklesIcon className="w-6 h-6 text-brand-accent mr-3" />
        <h3 className="text-lg font-bold text-text-primary">AI Assistant</h3>
      </div>
      <p className="text-text-secondary mb-4 text-sm">
        Ask a question about the school data. E.g., "Which students have overdue books?", "Who is the top student in Form 4?", or "What is our inventory level for lab equipment?"
      </p>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-brand-primary text-white px-6 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Thinking...
              </>
            ) : 'Ask'}
          </button>
        </div>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {response && (
        <div className="mt-6 p-4 bg-brand-light rounded-md border border-brand-secondary">
          <h4 className="font-bold text-text-primary mb-2">AI Response:</h4>
          <p className="text-text-secondary whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;