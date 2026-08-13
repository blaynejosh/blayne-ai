import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage.jsx';
import ChatPage from './components/ChatPage.jsx';

/**
 * Two surfaces: the marketing home page, and the chat product at one route
 * per Product Map layer. The hero's Explore pills cross from one to the other.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:category" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
