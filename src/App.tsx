import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomeScreen } from './app/screens/HomeScreen'
import { SessionScreen } from './app/screens/SessionScreen'
import { SessionCompleteScreen } from './app/screens/SessionCompleteScreen'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/session" element={<SessionScreen />} />
        <Route path="/session-complete" element={<SessionCompleteScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
