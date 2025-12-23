const NoteForm = ({ onSubmit, newNote, handleNoteChange }) => {
  return (
    <form onSubmit={onSubmit}>
      <input type="text" value={newNote} onChange={handleNoteChange} />
      <button type="submit">save</button>
    </form>
  );
};

export default NoteForm;
