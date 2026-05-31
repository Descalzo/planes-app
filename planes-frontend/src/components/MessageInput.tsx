import { useState } from 'react';

interface MessageInputProps {
  activityId: string;
}

export default function MessageInput({ activityId }: MessageInputProps) {
  const [text, setText] = useState('');

  return (
    <form className="message-input" onSubmit={(event) => event.preventDefault()}>
      <textarea
        value={text}
        placeholder="Escribe un mensaje..."
        onChange={(event) => setText(event.target.value)}
      />
      <button type="submit">Enviar</button>
    </form>
  );
}
