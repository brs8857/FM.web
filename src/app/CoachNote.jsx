import Callout from "../ui/Callout.jsx";
import notes from "../content/notes.json";

export default function CoachNote({ id, prefs, onDismiss }) {
  const note = notes[id];
  if (!note || prefs.seenNotes.includes(id)) return null;
  return <Callout title={note.title} onDismiss={() => onDismiss(id)}>{note.body}</Callout>;
}
