import { useEffect, useRef, useState } from "react";
import Footer from "./components/Footer";
import LoginForm from "./components/LoginForm";
import Note from "./components/Note";
import NoteForm from "./components/NoteForm";
import Notification from "./components/Notification";
import Togglable from "./components/Togglable";
import loginService from "./services/login";
import noteService from "./services/notes";

const App = () => {
  const [notes, setNotes] = useState([]);
  const [showAll, setShowAll] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [user, setUser] = useState(() => {
    const loggedUserJSON = window.localStorage.getItem("loggedNoteappUser");
    return loggedUserJSON ? JSON.parse(loggedUserJSON) : null;
  });
  const noteFormRef = useRef();

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const notes = await noteService.getAll();
        setNotes(notes);
      } catch (error) {
        console.error("Failed to fetch notes", error);
      }
    };

    fetchNotes();
  }, []);

  if (user) noteService.setToken(user.token);

  const login = async (loginObject) => {
    try {
      const user = await loginService.login(loginObject);

      window.localStorage.setItem("loggedNoteappUser", JSON.stringify(user));
      noteService.setToken(user.token);
      setUser(user);
    } catch {
      setErrorMessage("wrong credentials");
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("loggedNoteappUser");
    setUser(null);
  };

  const addNote = async (noteObject) => {
    noteFormRef.current.toggleVisibility();
    const returnedNote = await noteService.create(noteObject);
    setNotes((prevNotes) => prevNotes.concat(returnedNote));
  };

  const toggleImportance = async (id) => {
    const note = notes.find((note) => note.id === id);
    const changedNote = { ...note, important: !note.important };

    try {
      const returnedNote = await noteService.update(id, changedNote);
      setNotes(notes.map((note) => (note.id === id ? returnedNote : note)));
    } catch (error) {
      console.error("Failed to update note:", error);
      setErrorMessage(`Note '${note.content}' was already removed from server`);
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      setNotes(notes.filter((note) => note.id !== id));
    }
  };

  const notesToShow = showAll ? notes : notes.filter((note) => note.important);

  return (
    <div>
      <h1>Notes</h1>
      <Notification message={errorMessage} />

      {!user && (
        <Togglable buttonLabel="login">
          <LoginForm login={login} />
        </Togglable>
      )}

      {user && (
        <div>
          <div>
            <p>{user.name} logged in</p>
            <button onClick={handleLogout}>logout</button>
          </div>
          <Togglable buttonLabel="new note" ref={noteFormRef}>
            <NoteForm createNote={addNote} />
          </Togglable>
        </div>
      )}

      <div>
        <button onClick={() => setShowAll(!showAll)}>
          show {showAll ? "important" : "all"}
        </button>
      </div>
      <ul>
        {notesToShow.map((note) => (
          <Note
            key={note.id}
            note={note}
            toggleImportance={() => toggleImportance(note.id)}
          />
        ))}
      </ul>
      <Footer />
    </div>
  );
};

export default App;
