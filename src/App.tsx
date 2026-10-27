import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './screens/Home';
import Players from './screens/Players';
import CourseEditor from './screens/CourseEditor';
import EventSetup from './screens/EventSetup';
import Scoring from './screens/Scoring';
import Leaderboard from './screens/Leaderboard';
import SideGames from './screens/SideGames';
import History from './screens/History';

const TABS = [
  { to: '/', label: 'Events', end: true },
  { to: '/players', label: 'Players' },
  { to: '/course', label: 'Course' },
  { to: '/history', label: 'History' },
];

export default function App() {
  return (
    <div className="flex h-full flex-col bg-turf-900">
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<Players />} />
          <Route path="/course" element={<CourseEditor />} />
          <Route path="/history" element={<History />} />
          <Route path="/event/new" element={<EventSetup />} />
          <Route path="/event/:eventId/score" element={<Scoring />} />
          <Route path="/event/:eventId/leaderboard" element={<Leaderboard />} />
          <Route path="/event/:eventId/side-games" element={<SideGames />} />
        </Routes>
      </main>

      <nav className="flex shrink-0 border-t border-turf-700 bg-turf-800">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-sm font-semibold ${
                isActive ? 'text-sand-50' : 'text-sand-200/50'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
