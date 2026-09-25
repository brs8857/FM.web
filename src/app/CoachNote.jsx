import Callout from "../ui/Callout.jsx";
import notes from "../content/notes.json";

// A coach's note for a screen (spec 04 §5.8): shown until dismissed on this device.
export default function CoachNote({ id, prefs, onDismiss }) {
  const note = notes[id];
  if (!note || prefs.seenNotes.includes(id)) return null;
  return <Callout title={note.title} onDismiss={() => onDismiss(id)}>{note.body}</Callout>;
}
