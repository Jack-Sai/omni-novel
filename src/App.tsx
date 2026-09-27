import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout, WindowControls } from "./components/layout";
import { DataRecoveryBanner } from "./components/DataRecoveryBanner";
import {
  LoginPage,
  BookshelfPage,
  NewProjectPage,
  EditorPage,
  ChaptersPage,
  CharactersPage,
  WorldviewPage,
  ForeshadowingPage,
  MemoryPage,
  ConsistencyPage,
  SettingsPage,
} from "./pages";

function App() {
  return (
    <BrowserRouter>
      <WindowControls />
      <DataRecoveryBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/bookshelf" replace />} />
          <Route path="bookshelf" element={<BookshelfPage />} />
          <Route path="new-project" element={<NewProjectPage />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="chapters" element={<ChaptersPage />} />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="worldview" element={<WorldviewPage />} />
          <Route path="foreshadowing" element={<ForeshadowingPage />} />
          <Route path="memory" element={<MemoryPage />} />
          <Route path="consistency" element={<ConsistencyPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
