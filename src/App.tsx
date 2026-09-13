import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout";
import {
  LoginPage,
  BookshelfPage,
  NewProjectPage,
  EditorPage,
  OutlinePage,
  CharactersPage,
  WorldviewPage,
  ForeshadowingPage,
  SettingsPage,
} from "./pages";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/bookshelf" replace />} />
          <Route path="bookshelf" element={<BookshelfPage />} />
          <Route path="new-project" element={<NewProjectPage />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="outline" element={<OutlinePage />} />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="worldview" element={<WorldviewPage />} />
          <Route path="foreshadowing" element={<ForeshadowingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
